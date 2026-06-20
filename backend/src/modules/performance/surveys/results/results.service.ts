import { prisma } from "../../../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { gate, MIN_TEAM_SIZE } from "../rules/results";
import { createOrgChains } from "../../../shared/org/chains";
import {
  canViewSurveyResults,
  type ResultsViewerContext,
  type SurveyVisibilityInfo,
} from "../rules/results-visibility";
import { ResultsRepository } from "./results.repository";
import type { QuestionResult, SurveyResultsResponseDto } from "./results.types";
import type { Prisma } from "@prisma/client";

/**
 * Answers and options are stored as raw JSON, and two shapes exist in the wild: the
 * canonical one the app writes (number / string / string[]; options as string[]) and a
 * wrapped one ({ value }, { selected }, { choices }, [{ label }]). These coerce both to
 * the canonical form so aggregation never renders "[object Object]".
 */
function optionLabels(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { choices?: unknown }).choices)
      ? (raw as { choices: unknown[] }).choices
      : [];
  return arr
    .map((o) => (typeof o === "string" ? o : String((o as { label?: unknown })?.label ?? "")))
    .filter((s) => s !== "");
}

function scaleValue(data: unknown): number | null {
  const raw =
    data && typeof data === "object" && "value" in (data as Record<string, unknown>)
      ? (data as { value: unknown }).value
      : data;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function choiceValues(data: unknown): string[] {
  const unwrapped =
    data && typeof data === "object" && !Array.isArray(data) && "selected" in (data as Record<string, unknown>)
      ? (data as { selected: unknown }).selected
      : data;
  if (unwrapped === null || unwrapped === undefined) return [];
  const arr = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
  return arr
    .map((o) => (typeof o === "string" ? o : String((o as { label?: unknown })?.label ?? "")))
    .filter((s) => s !== "");
}

export class ResultsService {
  constructor(private readonly repo = new ResultsRepository()) {}

  async getResults(
    surveyId: string,
    occurrenceId: string | null,
    userId: string,
    role: string,
    teamIdQuery: string | null,
    supervisorIdQuery: string | null,
  ): Promise<SurveyResultsResponseDto> {
    // 1. Validate query filters: only one filter is allowed
    if (teamIdQuery && supervisorIdQuery) {
      throw new Error(SURVEY_ERROR_MESSAGES.BOTH_FILTERS_PROVIDED);
    }

    // 2. Fetch survey config
    const survey = await this.repo.findSurveyWithConfigs(surveyId);
    if (!survey) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
    }

    // 3. If occurrenceId is provided, validate its existence and connection to survey
    if (occurrenceId) {
      const occurrence = await this.repo.findOccurrence(occurrenceId);
      if (!occurrence || occurrence.surveyId !== survey.id) {
        throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
      }
    }

    // 4. Fetch caller employee record
    const caller = await prisma.employee.findUnique({
      where: { userId },
      include: { teamMemberships: true },
    });

    const isHR = role === "HR" || role === "ADMIN";

    // 4b. Small-team anonymity overlay. On anonymous surveys, a team-scoped view of a team
    //     with fewer than MIN_TEAM_SIZE members is hidden from that team's own supervisor
    //     (its leader), while HR and every manager above the leader may still see it — even
    //     though the group is below the normal min-group-size threshold. When granted, this
    //     overrides the generic visibility/filter checks below and lifts gate() suppression.
    let smallTeamOverride = false;
    if (survey.isAnonymous && teamIdQuery) {
      const team = await prisma.team.findUnique({
        where: { id: teamIdQuery },
        select: { leaderId: true, _count: { select: { members: true } } },
      });

      if (team && team._count.members < MIN_TEAM_SIZE) {
        const headsAbove = await createOrgChains(prisma).upwardChain(team.leaderId);
        const isLeader = !!caller && caller.id === team.leaderId;
        const isHeadAbove = !!caller && headsAbove.includes(caller.id);

        if (isHR || isHeadAbove) {
          smallTeamOverride = true;
        } else if (isLeader) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR);
        }
      }
    }

    // 5. Visibility check (server-side access gate). Reuses the shared predicate.
    if (!isHR && !smallTeamOverride) {
      if (!caller) {
        throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      }

      // SUPERVISOR_BASED needs to know whether any audience member is in the
      // caller's downward chain. Resolve that here; other visibilities ignore it.
      let supervisorAudienceOverlap = false;
      if (survey.visibility === "SUPERVISOR_BASED") {
        const chains = createOrgChains(prisma);
        const callerDownward = await chains.downwardChain(caller.id);
        const audienceMembers = await this.repo.findAudienceMembers(
          occurrenceId ? { occurrenceId } : { occurrence: { surveyId: survey.id } },
        );
        supervisorAudienceOverlap = audienceMembers.some((m) =>
          callerDownward.includes(m.employeeId),
        );
      }

      const ctx: ResultsViewerContext = {
        isHR: false,
        caller: {
          supervisorId: caller.supervisorId,
          teamIds: caller.teamMemberships.map((m) => m.teamId),
        },
      };
      const info: SurveyVisibilityInfo = {
        visibility: survey.visibility,
        audienceConfigTeamIds: survey.audienceConfigs
          .map((c: any) => c.teamId)
          .filter((id: any): id is string => !!id),
        visibilityConfigTeamIds: (survey.visibilityConfigs ?? []).map((vc: any) => vc.teamId),
      };

      if (!canViewSurveyResults(ctx, info, supervisorAudienceOverlap)) {
        throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      }
    }

    // 6. Check filter restrictions for non-HR callers
    if (!isHR && !smallTeamOverride && caller) {
      const chains = createOrgChains(prisma);
      const callerDownward = await chains.downwardChain(caller.id);

      if (teamIdQuery) {
        const callerTeamIds = caller.teamMemberships.map((m) => m.teamId);
        if (!callerTeamIds.includes(teamIdQuery)) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      }

      if (supervisorIdQuery) {
        if (supervisorIdQuery !== caller.id && !callerDownward.includes(supervisorIdQuery)) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      }
    }

    // 7. Build the response filter.
    const where: Prisma.SurveyResponseWhereInput = {};
    if (occurrenceId) {
      where.occurrenceId = occurrenceId;
    } else {
      where.occurrence = { surveyId: survey.id };
    }

    const chains = createOrgChains(prisma);

    // Resolve the caller's entitled scope once (non-HR only). The visibility check in
    // step 5 only gates ACCESS (may this viewer open the results at all); this is the data
    // boundary that constrains WHICH responses they may see. It is reused below by both
    // the breakdown filter and the headline counts. Without it an unfiltered query would
    // aggregate the whole audience and expose responses — including named free text —
    // from respondents outside the caller's scope. HR/ADMIN are entitled to the full
    // audience, so callerScope stays null for them.
    let callerScope:
      | { kind: "supervisor"; ids: string[] }
      | { kind: "team"; teamIds: string[] }
      | null = null;

    if (!isHR && caller) {
      if (survey.visibility === "SUPERVISOR_BASED") {
        const callerDownward = await chains.downwardChain(caller.id);
        callerScope = { kind: "supervisor", ids: [caller.id, ...callerDownward] };
      } else if (survey.visibility === "TEAM_BASED") {
        callerScope = { kind: "team", teamIds: caller.teamMemberships.map((m) => m.teamId) };
      } else if (survey.visibility === "SPECIFIC_TEAMS") {
        const allowedTeamIds = (survey.visibilityConfigs ?? []).map((vc: any) => vc.teamId);
        callerScope = {
          kind: "team",
          teamIds: caller.teamMemberships
            .map((m) => m.teamId)
            .filter((id) => allowedTeamIds.includes(id)),
        };
      }
      // EVERYONE / HR_ROOT_ONLY: callerScope stays null — entitled to the org-wide view.
    }

    const scopeFilters: Prisma.SurveyResponseWhereInput[] = [];

    // 7a. Mandatory caller-scope (non-HR).
    if (callerScope?.kind === "supervisor") {
      scopeFilters.push({ respondentSupervisorId: { in: callerScope.ids } });
    } else if (callerScope?.kind === "team") {
      scopeFilters.push({ respondentTeamIds: { hasSome: callerScope.teamIds } });
    }

    // 7b. Optional explicit scope filter (already validated against the caller's own scope
    //     in step 6). AND-composed with 7a so a drill-down can only narrow, never widen.
    if (teamIdQuery) {
      scopeFilters.push({ respondentTeamIds: { has: teamIdQuery } });
    }

    if (supervisorIdQuery) {
      const targetDownward = await chains.downwardChain(supervisorIdQuery);
      scopeFilters.push({ respondentSupervisorId: { in: [supervisorIdQuery, ...targetDownward] } });
    }

    if (scopeFilters.length > 0) {
      where.AND = scopeFilters;
    }

    // Fetch responses with answers
    const responses = await this.repo.findResponsesWithAnswers(where);

    // 8. Aggregation per question type
    const questionResults: QuestionResult[] = survey.questions.map((q: any) => {
      const answers = responses
        .map((r) => r.answers.find((a) => a.questionId === q.id))
        .filter((a): a is NonNullable<typeof a> => !!a);

      const responseCount = answers.length;

      if (q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") {
        const list = survey.isAnonymous
          ? []
          : answers
              .map((ans) => ans.answerText)
              .filter((text): text is string => typeof text === "string" && text.trim() !== "");
        return {
          questionId: q.id,
          type: q.type,
          questionText: q.questionText,
          responseCount,
          responses: list,
        };
      } else if (q.type === "LINEAR_SCALE") {
        const minVal = q.scaleMin ?? 1;
        const maxVal = q.scaleMax ?? 5;
        const distribution: Record<string, number> = {};
        for (let i = minVal; i <= maxVal; i++) {
          distribution[String(i)] = 0;
        }

        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let validCount = 0;

        for (const ans of answers) {
          const val = scaleValue(ans.answerData);
          if (val !== null) {
            distribution[String(val)] = (distribution[String(val)] || 0) + 1;
            sum += val;
            if (val < min) min = val;
            if (val > max) max = val;
            validCount++;
          }
        }

        return {
          questionId: q.id,
          type: q.type,
          questionText: q.questionText,
          responseCount,
          average: validCount > 0 ? sum / validCount : 0,
          min: validCount > 0 ? min : 0,
          max: validCount > 0 ? max : 0,
          distribution,
        };
      } else if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
        const counts: Record<string, number> = {};
        for (const opt of optionLabels(q.options)) {
          counts[opt] = 0;
        }

        for (const ans of answers) {
          for (const choice of choiceValues(ans.answerData)) {
            counts[choice] = (counts[choice] || 0) + 1;
          }
        }

        return {
          questionId: q.id,
          type: q.type,
          questionText: q.questionText,
          responseCount,
          counts,
        };
      } else {
        // fallback
        return {
          questionId: q.id,
          type: q.type as any,
          questionText: q.questionText,
          responseCount,
          responses: [],
        };
      }
    });

    const isFilterActive = !!teamIdQuery || !!supervisorIdQuery;

    // Occurrence-level totals for the summary stat cards. For non-HR viewers these are bounded to
    // the caller's entitled scope (their slice) via callerScope below; for HR / unfiltered views no
    // scope is applied, so recipientCount reflects the whole audience — which the small-survey HR
    // override below depends on. Computed before suppression.
    const audienceCountWhere: Prisma.SurveyAudienceMemberWhereInput = occurrenceId
      ? { occurrenceId }
      : { occurrence: { surveyId: survey.id } };
    const responseCountWhere: Prisma.SurveyResponseWhereInput = occurrenceId
      ? { occurrenceId }
      : { occurrence: { surveyId: survey.id } };

    if (callerScope?.kind === "supervisor") {
      audienceCountWhere.employeeId = { in: callerScope.ids };
      responseCountWhere.respondentSupervisorId = { in: callerScope.ids };
    } else if (callerScope?.kind === "team") {
      audienceCountWhere.employee = {
        teamMemberships: { some: { teamId: { in: callerScope.teamIds } } },
      };
      responseCountWhere.respondentTeamIds = { hasSome: callerScope.teamIds };
    }

    const [recipientCount, respondedCount] = await Promise.all([
      this.repo.countAudienceMembers(audienceCountWhere),
      this.repo.countResponses(responseCountWhere),
    ]);

    // 9. Minimum-group-size suppression for anonymous surveys. It fires on ANY view with fewer
    //    than MIN_GROUP responses, EXCEPT where an override lifts it:
    //    (a) smallTeamOverride — a team-scoped view of a sub-3-member team, for HR / heads-above;
    //    (b) smallSurveyHrOverride — the survey's whole audience is itself below MIN_TEAM_SIZE and
    //        the caller is HR, so the unfiltered view IS that small group. The team's supervisor,
    //        being non-HR, stays suppressed here just as on a direct team filter.
    const smallSurveyHrOverride =
      survey.isAnonymous && isHR && !isFilterActive && recipientCount < MIN_TEAM_SIZE;
    const gated =
      smallTeamOverride || smallSurveyHrOverride
        ? { suppressed: false as const, data: questionResults }
        : gate({ count: responses.length, data: questionResults }, survey.isAnonymous);

    return {
      success: true,
      data: {
        surveyId: survey.id,
        ...(occurrenceId && { occurrenceId }),
        isAnonymous: survey.isAnonymous,
        surveyName: survey.name,
        deadline: survey.deadline instanceof Date ? survey.deadline.toISOString() : survey.deadline,
        isActive: survey.isActive,
        occurrenceCount: survey._count?.occurrences ?? 0,
        totalResponses: responses.length,
        recipientCount,
        respondedCount,
        filter: isFilterActive
          ? {
              ...(teamIdQuery && { teamId: teamIdQuery }),
              ...(supervisorIdQuery && { supervisorId: supervisorIdQuery }),
            }
          : null,
        suppressed: gated.suppressed,
        questions: gated.suppressed ? [] : gated.data,
      },
    };
  }
}
