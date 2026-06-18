import type { AudienceType, QuestionType, RecurringType, ReminderFrequency, SurveyVisibility } from "@prisma/client";
import type { CreateSurveyInput } from "./dto";
import type { ListSurveysQuery } from "./dto";
import { SURVEY_ERROR_MESSAGES } from "./surveys.constants";

const VALID_RECURRING_TYPES = new Set<string>([
  "ONE_TIME",
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "BI_MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
]);

const VALID_AUDIENCE_TYPES = new Set<string>(["EVERYONE", "SUPERVISOR_BASED", "SPECIFIC_TEAMS"]);

const VALID_VISIBILITIES = new Set<string>([
  "EVERYONE",
  "SUPERVISOR_BASED",
  "TEAM_BASED",
  "HR_ROOT_ONLY",
  "SPECIFIC_TEAMS",
]);

const VALID_QUESTION_TYPES = new Set<string>([
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "LINEAR_SCALE",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
]);

const VALID_REMINDER_FREQUENCIES = new Set<string>(["DAILY", "EVERY_X_DAYS", "WEEKLY"]);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const VALID_STATUSES = new Set<string>(["draft", "active", "inactive"]);

export class SurveysValidation {
  parseListQuery(query: Record<string, unknown>): ListSurveysQuery {
    const rawPage = query.page;
    const rawLimit = query.limit;
    const rawStatus = query.status;

    const page =
      typeof rawPage === "string" && Number.isInteger(Number(rawPage)) && Number(rawPage) > 0
        ? Number(rawPage)
        : DEFAULT_PAGE;

    const limit = Math.min(
      typeof rawLimit === "string" && Number.isInteger(Number(rawLimit)) && Number(rawLimit) > 0
        ? Number(rawLimit)
        : DEFAULT_LIMIT,
      MAX_LIMIT,
    );

    if (rawStatus !== undefined && !VALID_STATUSES.has(rawStatus as string)) {
      throw new Error(SURVEY_ERROR_MESSAGES.INVALID_STATUS);
    }

    const result: ListSurveysQuery = { page, limit };
    if (rawStatus) {
      result.status = rawStatus as ListSurveysQuery["status"];
    }

    return result;
  }

  parseCreateBody(body: unknown): CreateSurveyInput {
    if (!body || typeof body !== "object") {
      throw new Error("Request body is required");
    }

    const b = body as Record<string, unknown>;

    // --- name ---
    if (!b.name || typeof b.name !== "string") {
      throw new Error("name is required");
    }

    // --- recurringType ---
    if (b.recurringType !== undefined) {
      if (typeof b.recurringType !== "string" || !VALID_RECURRING_TYPES.has(b.recurringType)) {
        throw new Error(SURVEY_ERROR_MESSAGES.INVALID_RECURRING_TYPE);
      }
    }

    // --- audienceType ---
    if (b.audienceType !== undefined) {
      if (typeof b.audienceType !== "string" || !VALID_AUDIENCE_TYPES.has(b.audienceType)) {
        throw new Error(SURVEY_ERROR_MESSAGES.INVALID_AUDIENCE_TYPE);
      }
    }

    // --- visibility ---
    if (b.visibility !== undefined) {
      if (typeof b.visibility !== "string" || !VALID_VISIBILITIES.has(b.visibility)) {
        throw new Error(SURVEY_ERROR_MESSAGES.INVALID_VISIBILITY);
      }
    }

    // --- isAnonymous ---
    if (b.isAnonymous !== undefined && typeof b.isAnonymous !== "boolean") {
      throw new Error("isAnonymous must be a boolean");
    }

    // --- isActive ---
    if (b.isActive !== undefined && typeof b.isActive !== "boolean") {
      throw new Error("isActive must be a boolean");
    }

    // --- questions ---
    if (!Array.isArray(b.questions) || b.questions.length === 0) {
      throw new Error(SURVEY_ERROR_MESSAGES.QUESTIONS_REQUIRED);
    }

    const questions = b.questions.map((q: unknown, idx: number) => {
      if (!q || typeof q !== "object") throw new Error(`questions[${idx}] must be an object`);
      const qObj = q as Record<string, unknown>;

      if (!qObj.type || typeof qObj.type !== "string" || !VALID_QUESTION_TYPES.has(qObj.type)) {
        throw new Error(`questions[${idx}]: ${SURVEY_ERROR_MESSAGES.INVALID_QUESTION_TYPE}`);
      }
      if (!qObj.questionText || typeof qObj.questionText !== "string") {
        throw new Error(`questions[${idx}]: questionText is required`);
      }
      if (typeof qObj.orderIndex !== "number" || !Number.isInteger(qObj.orderIndex)) {
        throw new Error(`questions[${idx}]: orderIndex must be an integer`);
      }

      const type = qObj.type as QuestionType;

      // Type-specific rules
      if (type === "LINEAR_SCALE") {
        if (typeof qObj.scaleMin !== "number" || typeof qObj.scaleMax !== "number") {
          throw new Error(`questions[${idx}]: ${SURVEY_ERROR_MESSAGES.SCALE_BOUNDS_REQUIRED}`);
        }
      }
      if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX") {
        if (!Array.isArray(qObj.options) || qObj.options.length === 0) {
          throw new Error(`questions[${idx}]: ${SURVEY_ERROR_MESSAGES.OPTIONS_REQUIRED}`);
        }
      }

      return {
        type,
        questionText: qObj.questionText as string,
        isRequired: typeof qObj.isRequired === "boolean" ? qObj.isRequired : true,
        ...(Array.isArray(qObj.options) && { options: qObj.options }),
        ...(typeof qObj.scaleMin === "number" && { scaleMin: qObj.scaleMin }),
        ...(typeof qObj.scaleMax === "number" && { scaleMax: qObj.scaleMax }),
        ...(typeof qObj.scaleMinLabel === "string" && { scaleMinLabel: qObj.scaleMinLabel }),
        ...(typeof qObj.scaleMaxLabel === "string" && { scaleMaxLabel: qObj.scaleMaxLabel }),
        orderIndex: qObj.orderIndex as number,
      };
    });

    // --- audienceConfigs ---
    const resolvedAudienceType = (b.audienceType ?? "EVERYONE") as AudienceType;
    let audienceConfigs: CreateSurveyInput["audienceConfigs"] = undefined;

    if (resolvedAudienceType !== "EVERYONE" && b.audienceConfigs !== undefined) {
      if (!Array.isArray(b.audienceConfigs)) {
        throw new Error("audienceConfigs must be an array");
      }

      audienceConfigs = b.audienceConfigs.map((cfg: unknown, idx: number) => {
        if (!cfg || typeof cfg !== "object") {
          throw new Error(`audienceConfigs[${idx}] must be an object`);
        }
        const cfgObj = cfg as Record<string, unknown>;
        const hasSupervisor =
          typeof cfgObj.supervisorId === "string" && cfgObj.supervisorId.length > 0;
        const hasTeam = typeof cfgObj.teamId === "string" && cfgObj.teamId.length > 0;

        if (!hasSupervisor && !hasTeam) {
          throw new Error(`audienceConfigs[${idx}]: ${SURVEY_ERROR_MESSAGES.INVALID_AUDIENCE_CONFIG}`);
        }

        return {
          ...(hasSupervisor && { supervisorId: cfgObj.supervisorId as string }),
          ...(hasTeam && { teamId: cfgObj.teamId as string }),
        };
      });
    }
    // When audienceType = EVERYONE, audienceConfigs are silently ignored.

    // --- reminderConfig ---
    let reminderConfig: CreateSurveyInput["reminderConfig"] = undefined;
    if (b.reminderConfig !== undefined) {
      if (!b.reminderConfig || typeof b.reminderConfig !== "object") {
        throw new Error("reminderConfig must be an object");
      }
      const rc = b.reminderConfig as Record<string, unknown>;
      if (rc.frequency !== undefined) {
        if (typeof rc.frequency !== "string" || !VALID_REMINDER_FREQUENCIES.has(rc.frequency)) {
          throw new Error("reminderConfig.frequency is invalid");
        }
      }
      if (rc.frequency === "EVERY_X_DAYS" && typeof rc.everyXDays !== "number") {
        throw new Error("reminderConfig.everyXDays is required when frequency is EVERY_X_DAYS");
      }
      reminderConfig = {
        frequency: rc.frequency as ReminderFrequency | undefined,
        ...(typeof rc.everyXDays === "number" && { everyXDays: rc.everyXDays }),
      };
    }

    return {
      name: b.name as string,
      ...(b.recurringType !== undefined && { recurringType: b.recurringType as RecurringType }),
      ...(b.audienceType !== undefined && { audienceType: b.audienceType as AudienceType }),
      ...(b.visibility !== undefined && { visibility: b.visibility as SurveyVisibility }),
      ...(typeof b.isAnonymous === "boolean" && { isAnonymous: b.isAnonymous }),
      ...(typeof b.isActive === "boolean" && { isActive: b.isActive }),
      questions,
      ...(audienceConfigs !== undefined && { audienceConfigs }),
      ...(reminderConfig !== undefined && { reminderConfig }),
    };
  }
}
