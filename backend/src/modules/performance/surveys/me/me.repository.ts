import { prisma } from "../../../../core/database/prisma.service";
import type { PendingSurveyItem } from "./me.types";

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
        deadline: occ.deadline,
        occurrenceNumber: occ.occurrenceNumber,
        questions: srv.questions,
      };
    });
  }
}
