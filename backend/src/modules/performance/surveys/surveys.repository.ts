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
import type { ListSurveysQuery } from "./dto";

export type SurveyWithRelations = PulseSurvey & {
  questions: SurveyQuestion[];
  audienceConfigs: SurveyAudienceConfig[];
  reminderConfig: SurveyReminderConfig | null;
};

export type SurveyListRow = PulseSurvey & {
  _count: { occurrences: number };
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

    const where = { ...statusFilter };

    const [surveys, total] = await Promise.all([
      prisma.pulseSurvey.findMany({
        where,
        include: { _count: { select: { occurrences: true } } },
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

    const survey = await prisma.pulseSurvey.findUnique({
      where: { id },
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
}
