import { prisma } from "../../../../core/database/prisma.service";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { gate } from "../rules/results";
import { createOrgChains } from "../../../shared/org/chains";
import { ResultsRepository } from "./results.repository";
import type { QuestionResult, SurveyResultsResponseDto } from "./results.types";
import type { Prisma } from "@prisma/client";

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
          if (ans.answerData !== null && ans.answerData !== undefined) {
            const val = Number(ans.answerData);
            if (!isNaN(val)) {
              distribution[String(val)] = (distribution[String(val)] || 0) + 1;
              sum += val;
              if (val < min) min = val;
              if (val > max) max = val;
              validCount++;
            }
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
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            if (typeof opt === "string") {
              counts[opt] = 0;
            }
          }
        }

        for (const ans of answers) {
          if (ans.answerData !== null && ans.answerData !== undefined) {
            if (q.type === "CHECKBOX") {
              const arr = Array.isArray(ans.answerData) ? ans.answerData : [ans.answerData];
              for (const item of arr) {
                const val = String(item);
                counts[val] = (counts[val] || 0) + 1;
              }
            } else {
              const val = String(ans.answerData);
              counts[val] = (counts[val] || 0) + 1;
            }
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

    return {
      success: true,
      data: {
        surveyId: survey.id,
        ...(occurrenceId && { occurrenceId }),
        isAnonymous: survey.isAnonymous,
        totalResponses: responses.length,
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
