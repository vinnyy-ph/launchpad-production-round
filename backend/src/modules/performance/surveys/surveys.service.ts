import { prisma } from "../../../core/database/prisma.service";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import type {
  CreateSurveyInput,
  ListSurveysQuery,
  ListSurveysResponseDto,
  SurveyDetailResponseDto,
  SurveyListItemDto,
  SurveyResponseDto,
  UpdateSurveyInput,
} from "./dto";
import type { ApiSuccessResponseDto } from "../../../core/dto";
import { SURVEY_ERROR_MESSAGES } from "./surveys.constants";
import {
  SurveysRepository,
  type SurveyDetailRow,
  type SurveyListRow,
  type SurveyWithRelations,
} from "./surveys.repository";

export class SurveysService {
  constructor(private readonly surveysRepository = new SurveysRepository()) {}

  async create(
    input: CreateSurveyInput,
    userId: string,
  ): Promise<ApiSuccessResponseDto<SurveyResponseDto>> {
    // Resolve the calling user to an Employee record
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error(SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE);

    const survey = await this.surveysRepository.create({
      createdBy: employee.id,
      name: input.name,
      recurringType: input.recurringType ?? "ONE_TIME",
      audienceType: input.audienceType ?? "EVERYONE",
      isAnonymous: input.isAnonymous ?? false,
      isActive: input.isActive ?? false,
      visibility: input.visibility ?? "EVERYONE",
      questions: input.questions.map((q) => ({
        type: q.type,
        questionText: q.questionText,
        isRequired: q.isRequired ?? true,
        ...(q.options !== undefined && { options: q.options }),
        ...(q.scaleMin !== undefined && { scaleMin: q.scaleMin }),
        ...(q.scaleMax !== undefined && { scaleMax: q.scaleMax }),
        ...(q.scaleMinLabel !== undefined && { scaleMinLabel: q.scaleMinLabel }),
        ...(q.scaleMaxLabel !== undefined && { scaleMaxLabel: q.scaleMaxLabel }),
        orderIndex: q.orderIndex,
      })),
      // audienceConfigs only forwarded for non-EVERYONE types; validation already stripped them otherwise
      audienceConfigs: input.audienceConfigs ?? [],
      ...(input.reminderConfig !== undefined && {
        reminderConfig: {
          frequency: input.reminderConfig.frequency ?? "DAILY",
          ...(input.reminderConfig.everyXDays !== undefined && {
            everyXDays: input.reminderConfig.everyXDays,
          }),
        },
      }),
    });

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.SURVEY_CREATED,
      data: this.toResponse(survey),
    };
  }

  async list(query: ListSurveysQuery): Promise<ListSurveysResponseDto> {
    const { surveys, total } = await this.surveysRepository.findAll(query);

    return {
      success: true,
      data: surveys.map((s) => this.toListItem(s)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(id: string): Promise<ApiSuccessResponseDto<SurveyDetailResponseDto>> {
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.SURVEY_RETRIEVED,
      data: this.toDetailResponse(survey),
    };
  }

  async update(
    id: string,
    input: UpdateSurveyInput,
  ): Promise<ApiSuccessResponseDto<SurveyDetailResponseDto>> {
    // 1. Fetch survey first to check existence and occurrences
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    const hasOccurrences = survey._count.occurrences > 0;

    // 2. Check edit guard
    if (hasOccurrences) {
      const hasGuardedFields =
        input.questions !== undefined ||
        input.audienceType !== undefined ||
        input.audienceConfigs !== undefined ||
        input.isAnonymous !== undefined ||
        input.recurringType !== undefined;

      if (hasGuardedFields) {
        throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED);
      }
    }

    // 3. Sanitization based on audienceType and reminderConfig
    if (input.audienceType === "EVERYONE") {
      input.audienceConfigs = [];
    }

    if (input.reminderConfig && input.reminderConfig !== null) {
      input.reminderConfig = {
        frequency: input.reminderConfig.frequency ?? "DAILY",
        ...(input.reminderConfig.everyXDays !== undefined && {
          everyXDays: input.reminderConfig.everyXDays,
        }),
      };
    }

    // 4. Perform update
    const updatedSurvey = await this.surveysRepository.update(id, input, hasOccurrences);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toDetailResponse(updatedSurvey),
    };
  }

  private toListItem(survey: SurveyListRow): SurveyListItemDto {
    return {
      id: survey.id,
      name: survey.name,
      recurringType: survey.recurringType,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      visibility: survey.visibility,
      isActive: survey.isActive,
      occurrenceCount: survey._count.occurrences,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    };
  }

  private toDetailResponse(survey: SurveyDetailRow): SurveyDetailResponseDto {
    return {
      id: survey.id,
      createdBy: survey.createdBy,
      name: survey.name,
      recurringType: survey.recurringType,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      isActive: survey.isActive,
      visibility: survey.visibility,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      occurrenceCount: survey._count.occurrences,
      questions: survey.questions.map((q) => ({
        id: q.id,
        surveyId: q.surveyId,
        type: q.type,
        questionText: q.questionText,
        isRequired: q.isRequired,
        options: q.options,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
        orderIndex: q.orderIndex,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      audienceConfigs: survey.audienceConfigs.map((cfg) => ({
        id: cfg.id,
        surveyId: cfg.surveyId,
        supervisorId: cfg.supervisorId,
        teamId: cfg.teamId,
        createdAt: cfg.createdAt,
        updatedAt: cfg.updatedAt,
      })),
      visibilityConfigs: (survey.visibilityConfigs ?? []).map((vc) => ({
        id: vc.id,
        surveyId: vc.surveyId,
        teamId: vc.teamId,
        createdAt: vc.createdAt,
        updatedAt: vc.updatedAt,
      })),
      reminderConfig: survey.reminderConfig
        ? {
            id: survey.reminderConfig.id,
            surveyId: survey.reminderConfig.surveyId,
            frequency: survey.reminderConfig.frequency,
            everyXDays: survey.reminderConfig.everyXDays,
            createdAt: survey.reminderConfig.createdAt,
            updatedAt: survey.reminderConfig.updatedAt,
          }
        : null,
    };
  }

  private toResponse(survey: SurveyWithRelations): SurveyResponseDto {
    return {
      id: survey.id,
      createdBy: survey.createdBy,
      name: survey.name,
      recurringType: survey.recurringType,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      isActive: survey.isActive,
      visibility: survey.visibility,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      questions: survey.questions.map((q) => ({
        id: q.id,
        surveyId: q.surveyId,
        type: q.type,
        questionText: q.questionText,
        isRequired: q.isRequired,
        options: q.options,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
        orderIndex: q.orderIndex,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      audienceConfigs: survey.audienceConfigs.map((cfg) => ({
        id: cfg.id,
        surveyId: cfg.surveyId,
        supervisorId: cfg.supervisorId,
        teamId: cfg.teamId,
        createdAt: cfg.createdAt,
        updatedAt: cfg.updatedAt,
      })),
      visibilityConfigs: [],
      reminderConfig: survey.reminderConfig
        ? {
            id: survey.reminderConfig.id,
            surveyId: survey.reminderConfig.surveyId,
            frequency: survey.reminderConfig.frequency,
            everyXDays: survey.reminderConfig.everyXDays,
            createdAt: survey.reminderConfig.createdAt,
            updatedAt: survey.reminderConfig.updatedAt,
          }
        : null,
    };
  }
}
