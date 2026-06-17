import type { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/database/prisma.service";
import type {
  AnswerInput,
  OccurrenceForResponse,
  ResponderEmployee,
  ResponsesRepositoryPort,
} from "./responses.types";
import type { SurveyResponseRow } from "../rules/response-firewall";

/** Prisma-backed persistence for the pulse-response flow. */
export class ResponsesRepository implements ResponsesRepositoryPort {
  async findResponder(userId: string): Promise<ResponderEmployee | null> {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, supervisorId: true, teamMemberships: { select: { teamId: true } } },
    });
    if (!employee) return null;
    return {
      id: employee.id,
      supervisorId: employee.supervisorId,
      teamIds: employee.teamMemberships.map((membership) => membership.teamId),
    };
  }

  async findOccurrence(occurrenceId: string): Promise<OccurrenceForResponse | null> {
    const occurrence = await prisma.surveyOccurrence.findUnique({
      where: { id: occurrenceId },
      select: { id: true, isClosed: true, deadline: true, survey: { select: { isAnonymous: true } } },
    });
    if (!occurrence) return null;
    return {
      id: occurrence.id,
      isClosed: occurrence.isClosed,
      deadline: occurrence.deadline,
      isAnonymous: occurrence.survey.isAnonymous,
    };
  }

  async isAudienceMember(occurrenceId: string, employeeId: string): Promise<boolean> {
    const member = await prisma.surveyAudienceMember.findUnique({
      where: { occurrenceId_employeeId: { occurrenceId, employeeId } },
      select: { employeeId: true },
    });
    return member !== null;
  }

  async hasCompleted(occurrenceId: string, employeeId: string): Promise<boolean> {
    const completion = await prisma.surveyCompletion.findUnique({
      where: { occurrenceId_employeeId: { occurrenceId, employeeId } },
      select: { employeeId: true },
    });
    return completion !== null;
  }

  async persistResponse(args: {
    row: SurveyResponseRow;
    answers: AnswerInput[];
    employeeId: string;
  }): Promise<void> {
    const { row, answers, employeeId } = args;
    await prisma.$transaction(async (tx) => {
      await tx.surveyResponse.create({
        data: {
          occurrenceId: row.occurrenceId,
          employeeId: row.employeeId,
          respondentSupervisorId: row.respondentSupervisorId,
          respondentTeamIds: row.respondentTeamIds,
          answers: {
            create: answers.map((answer) => ({
              questionId: answer.questionId,
              answerText: answer.answerText ?? null,
              ...(answer.answerData === undefined
                ? {}
                : { answerData: answer.answerData as Prisma.InputJsonValue }),
            })),
          },
        },
      });
      await tx.surveyCompletion.create({ data: { occurrenceId: row.occurrenceId, employeeId } });
    });
  }
}
