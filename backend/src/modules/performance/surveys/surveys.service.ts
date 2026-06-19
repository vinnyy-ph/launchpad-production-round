import type { AudienceType } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import type {
  AudienceOptionsResponseDto,
  AudiencePreviewInput,
  AudiencePreviewResponseDto,
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
import { NotificationsService } from "../../notifications/notifications.service";
import { resolveAudience } from "./rules/audience";
import { buildAudienceDb, toAudienceSpec } from "./surveys.audience";
import { validateSchedule } from "./rules/recurrence";
import {
  SurveysRepository,
  type SurveyDetailRow,
  type SurveyListRow,
  type SurveyWithRelations,
} from "./surveys.repository";

export class SurveysService {
  constructor(
    private readonly surveysRepository = new SurveysRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

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
      releaseDate: input.releaseDate ?? new Date(),
      deadline: input.deadline,
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
        input.recurringType !== undefined ||
        input.releaseDate !== undefined ||
        input.deadline !== undefined;

      if (hasGuardedFields) {
        throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED);
      }
    }

    // Validate schedule if releaseDate or deadline is changing
    if (input.releaseDate !== undefined || input.deadline !== undefined) {
      const finalReleaseDate = input.releaseDate !== undefined ? input.releaseDate : survey.releaseDate;
      const finalDeadline = input.deadline !== undefined ? input.deadline : survey.deadline;
      validateSchedule(finalReleaseDate, finalDeadline);
    }

    // 3. Sanitization based on audienceType and reminderConfig
    if (input.audienceType === "EVERYONE") {
      input.audienceConfigs = [];
    }

    // Require audience configs when the resulting audience is non-EVERYONE. Only checked
    // when the request actually touches the audience, so name-only edits never trip it.
    if (input.audienceType !== undefined || input.audienceConfigs !== undefined) {
      const finalAudienceType = input.audienceType ?? survey.audienceType;
      const finalConfigs =
        input.audienceConfigs !== undefined
          ? input.audienceConfigs
          : survey.audienceConfigs.map((c) => ({
              supervisorId: c.supervisorId ?? undefined,
              teamId: c.teamId ?? undefined,
            }));
      this.assertAudienceConfigsPresent(finalAudienceType, finalConfigs);
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

  async delete(id: string): Promise<void> {
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    if (survey.isActive || survey._count.occurrences > 0) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED);
    }

    await this.surveysRepository.softDelete(id);
  }

  async activate(id: string): Promise<ApiSuccessResponseDto<SurveyDetailResponseDto>> {
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    if (survey.isActive) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVE);
    }
    if (survey._count.occurrences > 0) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED);
    }

    // Resolve the audience using the same adapter + spec mapping the preview endpoint
    // uses, so "who will receive this" is identical before and at activation.
    const spec = toAudienceSpec(
      survey.audienceType,
      survey.audienceConfigs.map((c) => ({
        supervisorId: c.supervisorId ?? undefined,
        teamId: c.teamId ?? undefined,
      })),
    );
    const audienceIds = await resolveAudience(spec, buildAudienceDb());

    // Call repository to save activation state atomically
    const occurrenceData = {
      releaseDate: survey.releaseDate,
      deadline: survey.deadline,
    };
    const updated = await this.surveysRepository.activate(id, occurrenceData, audienceIds);

    await this.notificationsService.notifyNewPulse(audienceIds, survey.id, survey.name);

    return {
      success: true,
      message: "Pulse survey activated successfully",
      data: this.toDetailResponse(updated),
    };
  }

  async deactivate(id: string): Promise<ApiSuccessResponseDto<SurveyDetailResponseDto>> {
    const survey = await this.surveysRepository.findById(id);
    if (!survey) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);

    if (!survey.isActive) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_INACTIVE);
    }

    // Find the current open occurrence: most recent SurveyOccurrence where isClosed: false
    const openOccurrence = await prisma.surveyOccurrence.findFirst({
      where: {
        surveyId: id,
        isClosed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    let updated: SurveyDetailRow;
    if (!openOccurrence) {
      await prisma.pulseSurvey.update({
        where: { id },
        data: { isActive: false },
      });
      const detail = await this.surveysRepository.findById(id);
      if (!detail) throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
      updated = detail;
    } else {
      updated = await this.surveysRepository.deactivate(id, openOccurrence.id);
    }

    return {
      success: true,
      message: "Pulse survey deactivated successfully",
      data: this.toDetailResponse(updated),
    };
  }

  async listOccurrences(
    surveyId: string,
    query: { page: number; limit: number }
  ): Promise<any> {
    const survey = await this.surveysRepository.findById(surveyId);
    if (!survey) {
      throw new Error(SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND);
    }

    const { occurrences, total } = await this.surveysRepository.findOccurrencesBySurveyId(surveyId, query);

    const formattedOccurrences = occurrences.map((occ) => ({
      id: occ.id,
      occurrenceNumber: occ.occurrenceNumber,
      releaseDate: occ.releaseDate,
      deadline: occ.deadline,
      isClosed: occ.isClosed,
      audienceSize: occ._count.audienceMembers,
      completionCount: occ._count.completions,
    }));

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.OCCURRENCES_RETRIEVED,
      data: formattedOccurrences,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Supervisors (active employees with at least one direct report) and teams, for the
   * audience builder. Minimal projection — keeps PII out of the picker payload.
   */
  async getAudienceOptions(): Promise<ApiSuccessResponseDto<AudienceOptionsResponseDto>> {
    const [supervisors, teams] = await Promise.all([
      prisma.employee.findMany({
        where: { status: "ACTIVE", directReports: { some: {} } },
        select: { id: true, firstName: true, lastName: true, jobTitle: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      message: "Audience options retrieved successfully",
      data: {
        supervisors: supervisors.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`.trim(),
          jobTitle: s.jobTitle,
        })),
        teams,
      },
    };
  }

  /**
   * Resolves who would receive a survey for a given audience spec, WITHOUT persisting
   * anything. Uses the exact same resolver + DB adapter as activation, so the preview
   * matches what occurrence 1 will snapshot. `count` is authoritative; `members` is
   * capped for payload size.
   */
  async previewAudience(
    input: AudiencePreviewInput,
  ): Promise<ApiSuccessResponseDto<AudiencePreviewResponseDto>> {
    const MEMBER_CAP = 200;
    const spec = toAudienceSpec(input.audienceType, input.audienceConfigs);
    const ids = await resolveAudience(spec, buildAudienceDb());

    const members = await prisma.employee.findMany({
      where: { id: { in: ids.slice(0, MEMBER_CAP) } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return {
      success: true,
      message: "Audience preview resolved successfully",
      data: {
        count: ids.length,
        members: members.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`.trim(),
        })),
      },
    };
  }

  /** Throws a validation error when a non-EVERYONE audience has no matching config. */
  private assertAudienceConfigsPresent(
    audienceType: AudienceType,
    configs: { supervisorId?: string; teamId?: string }[],
  ): void {
    if (audienceType === "SUPERVISOR_BASED") {
      const hasSupervisor = configs.some(
        (c) => typeof c.supervisorId === "string" && c.supervisorId.length > 0,
      );
      if (!hasSupervisor) {
        throw new Error(SURVEY_ERROR_MESSAGES.AUDIENCE_CONFIG_REQUIRED_SUPERVISOR);
      }
    } else if (audienceType === "SPECIFIC_TEAMS") {
      const hasTeam = configs.some(
        (c) => typeof c.teamId === "string" && c.teamId.length > 0,
      );
      if (!hasTeam) {
        throw new Error(SURVEY_ERROR_MESSAGES.AUDIENCE_CONFIG_REQUIRED_TEAM);
      }
    }
  }

  private toListItem(survey: SurveyListRow): SurveyListItemDto {
    const latest = survey.occurrences?.[0];
    return {
      id: survey.id,
      name: survey.name,
      recurringType: survey.recurringType,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      visibility: survey.visibility,
      isActive: survey.isActive,
      occurrenceCount: survey._count.occurrences,
      recipientCount: latest?._count.audienceMembers ?? 0,
      respondedCount: latest?._count.completions ?? 0,
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
      releaseDate: survey.releaseDate,
      deadline: survey.deadline,
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
      releaseDate: survey.releaseDate,
      deadline: survey.deadline,
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

