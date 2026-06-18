import type {
  PulseSurvey,
  SurveyAudienceConfig,
  SurveyQuestion,
  SurveyReminderConfig,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { CreateSurveyData } from "./surveys.types";

export type SurveyWithRelations = PulseSurvey & {
  questions: SurveyQuestion[];
  audienceConfigs: SurveyAudienceConfig[];
  reminderConfig: SurveyReminderConfig | null;
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
}
