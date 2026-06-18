import { prisma } from "../../../../core/database/prisma.service";
import type { OccurrenceDetail } from "./occurrences.types";

export class OccurrencesRepository {
  async findById(id: string): Promise<OccurrenceDetail | null> {
    const occurrence = await prisma.surveyOccurrence.findUnique({
      where: { id },
      select: {
        id: true,
        surveyId: true,
        occurrenceNumber: true,
        releaseDate: true,
        deadline: true,
        isClosed: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            audienceMembers: true,
            completions: true,
          },
        },
      },
    });

    if (!occurrence) return null;

    return {
      id: occurrence.id,
      surveyId: occurrence.surveyId,
      occurrenceNumber: occurrence.occurrenceNumber,
      releaseDate: occurrence.releaseDate,
      deadline: occurrence.deadline,
      isClosed: occurrence.isClosed,
      audienceSize: occurrence._count.audienceMembers,
      completionCount: occurrence._count.completions,
      createdAt: occurrence.createdAt,
      updatedAt: occurrence.updatedAt,
    };
  }
}
