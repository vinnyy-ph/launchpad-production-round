import { prisma } from "../../../../core/database/prisma.service";
import type { AnsweredSurveyItem, PendingSurveyItem } from "./me.types";

/** Occurrence + survey shell (with ordered questions) for rendering an employee's own answers. */
export interface MyAnswersOccurrence {
  surveyId: string;
  surveyName: string;
  occurrenceNumber: number;
  isAnonymous: boolean;
  questions: {
    id: string;
    questionText: string;
    type: string;
    options: unknown;
    scaleMin: number | null;
    scaleMax: number | null;
    scaleMinLabel: string | null;
    scaleMaxLabel: string | null;
  }[];
}

export class MeRepository {
  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    return employee?.id ?? null;
  }

  async findPendingSurveys(employeeId: string, now: Date): Promise<PendingSurveyItem[]> {
    const audienceMembers = await prisma.surveyAudienceMember.findMany({
      where: {
        employeeId,
        occurrence: {
          isClosed: false,
          deadline: {
            gt: now,
          },
          completions: {
            none: {
              employeeId,
            },
          },
        },
      },
      select: {
        occurrence: {
          select: {
            id: true,
            occurrenceNumber: true,
            deadline: true,
            survey: {
              select: {
                id: true,
                name: true,
                isAnonymous: true,
                questions: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    surveyId: true,
                    type: true,
                    questionText: true,
                    isRequired: true,
                    options: true,
                    scaleMin: true,
                    scaleMax: true,
                    scaleMinLabel: true,
                    scaleMaxLabel: true,
                    orderIndex: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return audienceMembers.map((am) => {
      const occ = am.occurrence;
      const srv = occ.survey;
      return {
        occurrenceId: occ.id,
        surveyId: srv.id,
        surveyName: srv.name,
        isAnonymous: srv.isAnonymous,
        deadline: occ.deadline,
        occurrenceNumber: occ.occurrenceNumber,
        questions: srv.questions,
      };
    });
  }

  /** Pulses this employee has already completed, most recent first. */
  async findAnsweredSurveys(employeeId: string): Promise<AnsweredSurveyItem[]> {
    const completions = await prisma.surveyCompletion.findMany({
      where: { employeeId },
      orderBy: { completedAt: "desc" },
      select: {
        completedAt: true,
        occurrence: {
          select: {
            id: true,
            occurrenceNumber: true,
            survey: { select: { id: true, name: true, isAnonymous: true } },
          },
        },
      },
    });

    return completions.map((c) => ({
      occurrenceId: c.occurrence.id,
      surveyId: c.occurrence.survey.id,
      surveyName: c.occurrence.survey.name,
      isAnonymous: c.occurrence.survey.isAnonymous,
      occurrenceNumber: c.occurrence.occurrenceNumber,
      completedAt: c.completedAt,
    }));
  }

  /** Occurrence + its survey's ordered questions, for rendering the employee's own answers. */
  async findOccurrenceForMyAnswers(occurrenceId: string): Promise<MyAnswersOccurrence | null> {
    const occ = await prisma.surveyOccurrence.findUnique({
      where: { id: occurrenceId },
      select: {
        occurrenceNumber: true,
        survey: {
          select: {
            id: true,
            name: true,
            isAnonymous: true,
            questions: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                questionText: true,
                type: true,
                options: true,
                scaleMin: true,
                scaleMax: true,
                scaleMinLabel: true,
                scaleMaxLabel: true,
              },
            },
          },
        },
      },
    });
    if (!occ) return null;
    return {
      surveyId: occ.survey.id,
      surveyName: occ.survey.name,
      occurrenceNumber: occ.occurrenceNumber,
      isAnonymous: occ.survey.isAnonymous,
      questions: occ.survey.questions,
    };
  }

  /** Whether this employee completed the occurrence (works for anonymous surveys too). */
  async hasCompleted(occurrenceId: string, employeeId: string): Promise<boolean> {
    const completion = await prisma.surveyCompletion.findUnique({
      where: { occurrenceId_employeeId: { occurrenceId, employeeId } },
      select: { occurrenceId: true },
    });
    return completion !== null;
  }

  /** The employee's own answers for an occurrence. Returns nothing for anonymous surveys
   *  (the response carries no employee link), so callers must gate on anonymity first. */
  async findMyAnswers(
    occurrenceId: string,
    employeeId: string,
  ): Promise<{ questionId: string; answerText: string | null; answerData: unknown }[]> {
    return prisma.surveyAnswer.findMany({
      where: { response: { occurrenceId, employeeId } },
      select: { questionId: true, answerText: true, answerData: true },
    });
  }
}
