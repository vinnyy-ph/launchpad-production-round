import { prisma } from "../../../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { gate } from "../rules/results";
import { createOrgChains } from "../../../shared/org/chains";
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

    // 5. Visibility check
    if (!isHR) {
      if (!caller) {
        throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      }

      const chains = createOrgChains(prisma);
      const callerDownward = await chains.downwardChain(caller.id);

      if (survey.visibility === "EVERYONE") {
        // Pass
      } else if (survey.visibility === "SUPERVISOR_BASED") {
        // check if caller's downward chain includes any audience member of this survey / occurrence
        const audienceMembers = await this.repo.findAudienceMembers(
          occurrenceId
            ? { occurrenceId }
            : { occurrence: { surveyId: survey.id } }
        );
        const audienceEmployeeIds = audienceMembers.map((m) => m.employeeId);
        const isAllowed = audienceEmployeeIds.some((id) => callerDownward.includes(id));
        if (!isAllowed) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      } else if (survey.visibility === "TEAM_BASED") {
        // any team member whose team is part of the survey audience
        const audienceTeamIds = survey.audienceConfigs
          .map((c: any) => c.teamId)
          .filter((id: any): id is string => !!id);
        const callerTeamIds = caller.teamMemberships.map((m) => m.teamId);
        const isAllowed = callerTeamIds.some((id) => audienceTeamIds.includes(id));
        if (!isAllowed) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      } else if (survey.visibility === "HR_ROOT_ONLY") {
        // HR only + the root node employee (employee with no supervisor)
        if (caller.supervisorId !== null) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      } else if (survey.visibility === "SPECIFIC_TEAMS") {
        // employees belonging to any team in SurveyVisibilityConfig
        const allowedTeamIds = (survey.visibilityConfigs ?? []).map((vc: any) => vc.teamId);
        const callerTeamIds = caller.teamMemberships.map((m) => m.teamId);
        const isAllowed = callerTeamIds.some((id) => allowedTeamIds.includes(id));
        if (!isAllowed) {
          throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
        }
      } else {
        throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
      }
    }

    // 6. Check filter restrictions for non-HR callers
    if (!isHR && caller) {
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

    // 7. Build responses where filter
    const where: Prisma.SurveyResponseWhereInput = {};
    if (occurrenceId) {
      where.occurrenceId = occurrenceId;
    } else {
      where.occurrence = { surveyId: survey.id };
    }

    const chains = createOrgChains(prisma);

    if (teamIdQuery) {
      where.respondentTeamIds = { has: teamIdQuery };
    }

    if (supervisorIdQuery) {
      const targetDownward = await chains.downwardChain(supervisorIdQuery);
      const targetSupervisors = [supervisorIdQuery, ...targetDownward];
      where.respondentSupervisorId = { in: targetSupervisors };
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

    // 9. Apply minimum-group-size suppression. For anonymous surveys this fires on ANY view
    //    with fewer than MIN_GROUP responses — the top-level summary as well as every
    //    team/supervisor filter — never only on filtered views.
    const isFilterActive = !!teamIdQuery || !!supervisorIdQuery;
    const gated = gate({ count: responses.length, data: questionResults }, survey.isAnonymous);

    // Occurrence-level totals for the summary stat cards — independent of the scope filter,
    // so the headline response rate reflects the whole audience, not the filtered slice.
    const scopeWhere = occurrenceId
      ? { occurrenceId }
      : { occurrence: { surveyId: survey.id } };
    const [recipientCount, respondedCount] = await Promise.all([
      this.repo.countAudienceMembers(scopeWhere),
      this.repo.countResponses(scopeWhere),
    ]);

    return {
      success: true,
      data: {
        surveyId: survey.id,
        ...(occurrenceId && { occurrenceId }),
        isAnonymous: survey.isAnonymous,
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
