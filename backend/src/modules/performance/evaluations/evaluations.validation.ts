import type { CreateEvaluationInput, ListEvaluationsQuery, UpdateEvaluationInput } from "./dto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class EvaluationsValidation {
  parseListQuery(query: Record<string, unknown>): ListEvaluationsQuery {
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

    if (rawStatus !== undefined && rawStatus !== "draft" && rawStatus !== "sent") {
      throw new Error("status must be 'draft' or 'sent'");
    }

    return { page, limit, ...(rawStatus && { status: rawStatus as "draft" | "sent" }) };
  }

  parseCreateBody(body: unknown): CreateEvaluationInput {
    if (!body || typeof body !== "object") {
      throw new Error("Request body is required");
    }

    const b = body as Record<string, unknown>;

    if (!b.revieweeId || typeof b.revieweeId !== "string") {
      throw new Error("revieweeId is required");
    }

    const periodStart = this.parseDate(b.periodStart, "periodStart", true);
    const periodEnd = this.parseDate(b.periodEnd, "periodEnd", true);
    if (periodEnd.getTime() < periodStart.getTime()) {
      throw new Error("periodEnd must be on or after periodStart");
    }

    const grade = typeof b.grade === "string" ? Number(b.grade) : b.grade;
    if (
      typeof grade !== "number" ||
      !Number.isInteger(grade) ||
      grade < 1 ||
      grade > 5
    ) {
      throw new Error("grade must be an integer between 1 and 5");
    }
    if (b.send !== undefined && typeof b.send !== "boolean") {
      throw new Error("send must be a boolean");
    }

    return {
      revieweeId: b.revieweeId,
      periodStart,
      periodEnd,
      grade: grade as number,
      ...(b.highlights !== undefined && { highlights: this.parseItemArray(b.highlights, "highlights") }),
      ...(b.lowlights !== undefined && { lowlights: this.parseItemArray(b.lowlights, "lowlights") }),
      ...(typeof b.evaluation === "string" && { evaluation: b.evaluation }),
      ...(typeof b.recommendation === "string" && { recommendation: b.recommendation }),
      ...(typeof b.send === "boolean" && { send: b.send }),
    };
  }

  parseUpdateBody(body: unknown): UpdateEvaluationInput {
    if (!body || typeof body !== "object") {
      throw new Error("Request body is required");
    }

    const b = body as Record<string, unknown>;
    const result: UpdateEvaluationInput = {};

    if (b.revieweeId !== undefined) {
      if (typeof b.revieweeId !== "string" || !b.revieweeId)
        throw new Error("revieweeId must be a string");
      result.revieweeId = b.revieweeId;
    }
    if (b.periodStart !== undefined) {
      result.periodStart = this.parseDate(b.periodStart, "periodStart", false);
    }
    if (b.periodEnd !== undefined) {
      result.periodEnd = this.parseDate(b.periodEnd, "periodEnd", false);
    }
    if (
      result.periodStart &&
      result.periodEnd &&
      result.periodEnd.getTime() < result.periodStart.getTime()
    ) {
      throw new Error("periodEnd must be on or after periodStart");
    }
    if (b.grade !== undefined) {
      const grade = typeof b.grade === "string" ? Number(b.grade) : b.grade;
      if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 5)
        throw new Error("grade must be an integer between 1 and 5");
      result.grade = grade;
    }
    if (b.send !== undefined) {
      if (typeof b.send !== "boolean") throw new Error("send must be a boolean");
      result.send = b.send;
    }
    if (b.highlights !== undefined) {
      result.highlights = this.parseItemArray(b.highlights, "highlights");
    }
    if (b.lowlights !== undefined) {
      result.lowlights = this.parseItemArray(b.lowlights, "lowlights");
    }

    for (const field of ["evaluation", "recommendation"] as const) {
      if (b[field] !== undefined) {
        if (typeof b[field] !== "string") throw new Error(`${field} must be a string`);
        result[field] = b[field] as string;
      }
    }

    if (Object.keys(result).length === 0) {
      throw new Error("No fields provided to update");
    }

    return result;
  }

  /** Parses an ISO date string into a Date. `required` controls the missing-value message. */
  private parseDate(value: unknown, field: string, required: boolean): Date {
    if (value === undefined || value === null || value === "") {
      throw new Error(required ? `${field} is required` : `${field} must be a valid date`);
    }
    if (typeof value !== "string" && !(value instanceof Date)) {
      throw new Error(`${field} must be a valid date`);
    }
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${field} must be a valid date`);
    }
    return date;
  }

  /** Itemized text → trimmed, non-empty string list. */
  private parseItemArray(value: unknown, field: string): string[] {
    const arr = Array.isArray(value) ? value : (typeof value === "string" ? [value] : value);
    if (!Array.isArray(arr) || !arr.every((item) => typeof item === "string")) {
      throw new Error(`${field} must be an array of strings`);
    }
    return (arr as string[]).map((item) => item.trim()).filter((item) => item.length > 0);
  }
}
