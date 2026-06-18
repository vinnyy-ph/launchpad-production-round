import { apiFetch } from "@/shared/lib/api-client";
import type {
  Survey,
  SurveyStatus,
  Recurrence,
  AudienceType,
  QuestionType,
  VisibilityScope,
  ReminderType,
} from "@/shared/mock/types";
import type {
  SurveyListItemDto,
  PaginatedResponse,
  RecurringType,
  ApiQuestionType,
  ApiSurveyVisibility,
  ReminderFrequency,
} from "../types/surveys.types";

const BASE = "/api/v1/pulse/surveys";

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getSurveys(): Promise<Survey[]> {
  const res = await apiFetch<PaginatedResponse<SurveyListItemDto>>(`${BASE}?limit=100`);
  return res.data
    .map(toSurvey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function toSurvey(item: SurveyListItemDto): Survey {
  return {
    id: item.id,
    title: item.name,
    description: "",
    questions: [],
    anonymous: item.isAnonymous,
    minGroupSize: 3,
    recurrence: item.recurringType === "ONE_TIME" ? "NONE" : (item.recurringType as Recurrence),
    status: deriveStatus(item),
    createdAt: item.createdAt,
    audienceType: item.audienceType as AudienceType,
  };
}

function deriveStatus(item: SurveyListItemDto): SurveyStatus {
  if (item.isActive) return "ACTIVE";
  if (item.occurrenceCount > 0) return "CLOSED";
  return "DRAFT";
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createSurvey(survey: Survey): Promise<void> {
  await apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(buildCreateBody(survey)),
  });
}

export async function updateSurvey(id: string, survey: Survey): Promise<void> {
  await apiFetch(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(buildCreateBody(survey)),
  });
}

export async function deleteSurvey(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function activateSurvey(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}/activate`, { method: "PATCH" });
}

export async function deactivateSurvey(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}/deactivate`, { method: "PATCH" });
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function buildCreateBody(survey: Survey) {
  return {
    name: survey.title,
    recurringType: mapRecurrence(survey.recurrence),
    audienceType: survey.audienceType ?? "EVERYONE",
    isAnonymous: survey.anonymous,
    visibility: mapVisibility(survey.visibilityScope ?? "SUPERVISOR_BASED"),
    releaseDate: survey.releaseDate ? new Date(survey.releaseDate) : new Date(),
    deadline: survey.deadline ? new Date(survey.deadline) : new Date(),
    questions: survey.questions.map((q, i) => ({
      type: mapQuestionType(q.type),
      questionText: q.prompt,
      isRequired: q.required ?? false,
      ...(q.type === "SINGLE" || q.type === "MULTI" ? { options: q.options ?? [] } : {}),
      ...(q.type === "RATING"
        ? {
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            scaleMinLabel: q.scaleMinLabel,
            scaleMaxLabel: q.scaleMaxLabel,
          }
        : {}),
      orderIndex: i,
    })),
    audienceConfigs:
      survey.audienceType === "SUPERVISOR_BASED" && survey.audienceSupervisorId
        ? [{ supervisorId: survey.audienceSupervisorId }]
        : survey.audienceType === "SPECIFIC_TEAMS" && survey.audienceTeamIds
          ? survey.audienceTeamIds.map((teamId) => ({ teamId }))
          : [],
    reminderConfig: buildReminderConfig(survey.reminderType ?? "NONE", survey.reminderIntervalDays),
  };
}

function mapRecurrence(r: Recurrence): RecurringType {
  return r === "NONE" ? "ONE_TIME" : (r as RecurringType);
}

function mapQuestionType(t: QuestionType): ApiQuestionType {
  const map: Record<QuestionType, ApiQuestionType> = {
    RATING: "LINEAR_SCALE",
    SINGLE: "MULTIPLE_CHOICE",
    MULTI: "CHECKBOX",
    TEXT: "SHORT_ANSWER",
  };
  return map[t];
}

function mapVisibility(v: VisibilityScope): ApiSurveyVisibility {
  const map: Record<VisibilityScope, ApiSurveyVisibility> = {
    ADMIN_ONLY: "HR_ROOT_ONLY",
    HR_ADMIN: "HR_ROOT_ONLY",
    SUPERVISOR_BASED: "SUPERVISOR_BASED",
    TEAM_LEADS: "TEAM_BASED",
    EVERYONE: "EVERYONE",
  };
  return map[v];
}

function buildReminderConfig(
  type: ReminderType,
  intervalDays?: number,
): { frequency: ReminderFrequency; everyXDays?: number } | undefined {
  if (type === "NONE") return undefined;
  const frequency = type as ReminderFrequency;
  return frequency === "EVERY_X_DAYS" ? { frequency, everyXDays: intervalDays } : { frequency };
}
