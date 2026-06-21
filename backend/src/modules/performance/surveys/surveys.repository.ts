import type {
  PulseSurvey,
  SurveyAudienceConfig,
  SurveyQuestion,
  SurveyReminderConfig,
  SurveyVisibilityConfig,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { CreateSurveyData } from "./surveys.types";
import type { ListSurveysQuery, UpdateSurveyInput } from "./dto";

export type SurveyWithRelations = PulseSurvey & {
  questions: SurveyQuestion[];
  audienceConfigs: SurveyAudienceConfig[];
  reminderConfig: SurveyReminderConfig | null;
};

export type SurveyListRow = PulseSurvey & {
  _count: { occurrences: number };
  // Latest occurrence only (most recent round), for the list's response-rate column.
  occurrences: { _count: { audienceMembers: number; completions: number } }[];
};

export type SurveyDetailRow = PulseSurvey & {
  questions: SurveyQuestion[];
  audienceConfigs: SurveyAudienceConfig[];
  visibilityConfigs: SurveyVisibilityConfig[];
  reminderConfig: SurveyReminderConfig | null;
  _count: { occurrences: number };
};

export class SurveysRepository {
  /**
   * Creates a PulseSurvey with its nested questions, audienceConfigs, and
   * optional reminderConfig inside a single interactive transaction.
   */
  async create(data: CreateSurveyData): Promise<SurveyWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. Create the survey
      const survey = await tx.pulseSurvey.create({
        data: {
          createdBy: data.createdBy,
          name: data.name,
          recurringType: data.recurringType,
          audienceType: data.audienceType,
          isAnonymous: data.isAnonymous,
          isActive: data.isActive,
          visibility: data.visibility,
          releaseDate: data.releaseDate,
          deadline: data.deadline,
        },
      });

      // 2. Create questions
      await tx.surveyQuestion.createMany({
        data: data.questions.map((q) => ({
          surveyId: survey.id,
          type: q.type,
          questionText: q.questionText,
          isRequired: q.isRequired,
          options: q.options !== undefined ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          scaleMin: q.scaleMin ?? null,
          scaleMax: q.scaleMax ?? null,
          scaleMinLabel: q.scaleMinLabel ?? null,
          scaleMaxLabel: q.scaleMaxLabel ?? null,
          orderIndex: q.orderIndex,
        })),
      });

      // 3. Create audience configs (only when provided)
      if (data.audienceConfigs.length > 0) {
        await tx.surveyAudienceConfig.createMany({
          data: data.audienceConfigs.map((cfg) => ({
            surveyId: survey.id,
            supervisorId: cfg.supervisorId ?? null,
            teamId: cfg.teamId ?? null,
          })),
        });
      }

      // 4. Create reminder config (optional)
      if (data.reminderConfig) {
        await tx.surveyReminderConfig.create({
          data: {
            surveyId: survey.id,
            frequency: data.reminderConfig.frequency,
            everyXDays: data.reminderConfig.everyXDays ?? null,
          },
        });
      }

      // 5. Fetch and return the full survey with relations
      return tx.pulseSurvey.findUniqueOrThrow({
        where: { id: survey.id },
        include: {
          questions: { orderBy: { orderIndex: "asc" } },
          audienceConfigs: true,
          reminderConfig: true,
        },
      });
    });
  }

  /**
   * Returns a paginated list of surveys with occurrence counts.
   * Status filter logic:
   *   draft    → isActive: false AND no occurrences exist
   *   active   → isActive: true
   *   inactive → isActive: false AND at least one occurrence exists
   */
  async findAll(query: ListSurveysQuery): Promise<{ surveys: SurveyListRow[]; total: number }> {
    let statusFilter: Record<string, unknown> = {};

    if (query.status === "draft") {
      statusFilter = { isActive: false, occurrences: { none: {} } };
    } else if (query.status === "active") {
      statusFilter = { isActive: true };
    } else if (query.status === "inactive") {
      statusFilter = { isActive: false, occurrences: { some: {} } };
    }

    const where = { ...statusFilter, deletedAt: null };

    const [surveys, total] = await Promise.all([
      prisma.pulseSurvey.findMany({
        where,
        include: {
          _count: { select: { occurrences: true } },
          occurrences: {
            orderBy: { occurrenceNumber: "desc" },
            take: 1,
            select: { _count: { select: { audienceMembers: true, completions: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.pulseSurvey.count({ where }),
    ]);

    return { surveys: surveys as SurveyListRow[], total };
  }

  /**
   * Returns a single survey with all relations for the detail view.
   * Gracefully handles visibilityConfigs not being available yet.
   */
  async findById(id: string): Promise<SurveyDetailRow | null> {
    const includeOptions: Record<string, unknown> = {
      questions: { orderBy: { orderIndex: "asc" } },
      audienceConfigs: true,
      reminderConfig: true,
      _count: { select: { occurrences: true } },
    };

    // Include visibilityConfigs if the relation exists on the Prisma model
    try {
      includeOptions.visibilityConfigs = true;
    } catch {
      // relation not available yet — will be handled below
    }

    const survey = await prisma.pulseSurvey.findFirst({
      where: { id, deletedAt: null },
      include: includeOptions,
    });

    if (!survey) return null;

    // Ensure visibilityConfigs is always present as an array
    const result = survey as unknown as SurveyDetailRow;
    if (!result.visibilityConfigs) {
      result.visibilityConfigs = [];
    }

    return result;
  }

  async update(id: string, data: UpdateSurveyInput, hasOccurrences: boolean): Promise<SurveyDetailRow> {
    return prisma.$transaction(async (tx) => {
      // 1. Update basic survey fields
      const updateData: Prisma.PulseSurveyUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Guarded fields (checked in service, but handled here)
      if (data.isAnonymous !== undefined) updateData.isAnonymous = data.isAnonymous;
      if (data.recurringType !== undefined) updateData.recurringType = data.recurringType;
      if (data.audienceType !== undefined) updateData.audienceType = data.audienceType;
      if (data.releaseDate !== undefined) updateData.releaseDate = data.releaseDate;
      if (data.deadline !== undefined) updateData.deadline = data.deadline;

      if (Object.keys(updateData).length > 0) {
        await tx.pulseSurvey.update({
          where: { id },
          data: updateData,
        });
      }

      // 2. Update questions (delete and replace)
      if (data.questions !== undefined) {
        await tx.surveyQuestion.deleteMany({ where: { surveyId: id } });
        await tx.surveyQuestion.createMany({
          data: data.questions.map((q) => ({
            surveyId: id,
            type: q.type,
            questionText: q.questionText,
            isRequired: q.isRequired,
            options: q.options !== undefined ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
            scaleMin: q.scaleMin ?? null,
            scaleMax: q.scaleMax ?? null,
            scaleMinLabel: q.scaleMinLabel ?? null,
            scaleMaxLabel: q.scaleMaxLabel ?? null,
            orderIndex: q.orderIndex,
          })),
        });
      }

      // 3. Update audienceConfigs (delete and replace)
      if (data.audienceConfigs !== undefined) {
        await tx.surveyAudienceConfig.deleteMany({ where: { surveyId: id } });
        if (data.audienceConfigs.length > 0) {
          await tx.surveyAudienceConfig.createMany({
            data: data.audienceConfigs.map((cfg) => ({
              surveyId: id,
              supervisorId: cfg.supervisorId ?? null,
              teamId: cfg.teamId ?? null,
            })),
          });
        }
      }

      // 4. Update reminderConfig (delete if null, else upsert)
      if (data.reminderConfig !== undefined) {
        if (data.reminderConfig === null) {
          await tx.surveyReminderConfig.deleteMany({ where: { surveyId: id } });
        } else {
          await tx.surveyReminderConfig.upsert({
            where: { surveyId: id },
            update: {
              frequency: data.reminderConfig.frequency,
              everyXDays: data.reminderConfig.everyXDays ?? null,
            },
            create: {
              surveyId: id,
              frequency: data.reminderConfig.frequency ?? "DAILY",
              everyXDays: data.reminderConfig.everyXDays ?? null,
            },
          });
        }
      }

      // 5. Fetch and return full survey
      const includeOptions: Record<string, unknown> = {
        questions: { orderBy: { orderIndex: "asc" } },
        audienceConfigs: true,
        reminderConfig: true,
        _count: { select: { occurrences: true } },
      };

      try {
        includeOptions.visibilityConfigs = true;
      } catch {
        // relation not available
      }

      const survey = await tx.pulseSurvey.findUniqueOrThrow({
        where: { id },
        include: includeOptions,
      });

      const result = survey as unknown as SurveyDetailRow;
      if (!result.visibilityConfigs) {
        result.visibilityConfigs = [];
      }

      return result;
    });
  }

  async activate(
    id: string,
    occurrenceData: { releaseDate: Date; deadline: Date },
    audienceIds: string[],
  ): Promise<{ survey: SurveyDetailRow; occurrenceId: string }> {
    const occurrenceId = await prisma.$transaction(async (tx) => {
      const occurrence = await tx.surveyOccurrence.create({
        data: {
          surveyId: id,
          occurrenceNumber: 1,
          releaseDate: occurrenceData.releaseDate,
          deadline: occurrenceData.deadline,
          isClosed: false,
        },
      });

      if (audienceIds.length > 0) {
        await tx.surveyAudienceMember.createMany({
          data: audienceIds.map((employeeId) => ({
            occurrenceId: occurrence.id,
            employeeId,
          })),
        });
      }

      await tx.pulseSurvey.update({
        where: { id },
        data: { isActive: true },
      });

      return occurrence.id;
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Survey not found after activation");
    }
    return { survey: updated, occurrenceId };
  }

  async deactivate(id: string, openOccurrenceId: string): Promise<SurveyDetailRow> {
    await prisma.$transaction(async (tx) => {
      await tx.surveyOccurrence.update({
        where: { id: openOccurrenceId },
        data: { isClosed: true },
      });

      await tx.pulseSurvey.update({
        where: { id },
        data: { isActive: false },
      });
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Survey not found after deactivation");
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.pulseSurvey.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findOccurrencesBySurveyId(
    surveyId: string,
    query: { page: number; limit: number }
  ): Promise<{
    occurrences: Array<{
      id: string;
      occurrenceNumber: number;
      releaseDate: Date;
      deadline: Date;
      isClosed: boolean;
      _count: {
        audienceMembers: number;
        completions: number;
      };
    }>;
    total: number;
  }> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [occurrences, total] = await Promise.all([
      prisma.surveyOccurrence.findMany({
        where: { surveyId },
        orderBy: { occurrenceNumber: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          occurrenceNumber: true,
          releaseDate: true,
          deadline: true,
          isClosed: true,
          _count: {
            select: {
              audienceMembers: true,
              completions: true,
            },
          },
        },
      }),
      prisma.surveyOccurrence.count({
        where: { surveyId },
      }),
    ]);

    return { occurrences, total };
  }
}
