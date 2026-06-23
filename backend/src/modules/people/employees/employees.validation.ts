import { EmployeeStatus } from "@prisma/client";
import type {
  EmployeeSortBy,
  GetEmployeeProfileParamsDto,
  ListEmployeesQueryDto,
  SortDirection,
  UpdateEmployeeAddressRequestDto,
  UpdateEmployeeEmergencyContactRequestDto,
  UpdateEmployeeProfileParamsDto,
  UpdateEmployeeProfileRequestDto,
} from "./dto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 500;
const SORT_FIELDS: EmployeeSortBy[] = [
  "employeeName",
  "jobTitle",
  "department",
  "supervisor",
  "teams",
  "status",
];

export class EmployeesValidation {
  /**
   * Converts raw Express query parameters into a typed DTO used by the employee list flow.
   * Empty strings are ignored, pagination defaults are applied, and status values are normalized.
   */
  parseListFilters(query: Record<string, unknown>): ListEmployeesQueryDto {
    const page = this.parsePositiveInteger(query.page, DEFAULT_PAGE);
    const limit = Math.min(this.parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const status = this.parseEmployeeStatus(query.status);

    return {
      page,
      limit,
      search: this.parseOptionalString(query.search),
      status,
      statuses: this.parseStatusList(query.statuses),
      teamId: this.parseOptionalString(query.teamId),
      team: this.parseOptionalString(query.team),
      teamIds: this.parseIdList(query.teamIds),
      departmentIds: this.parseIdList(query.departmentId),
      supervisorIds: this.parseIdList(query.supervisorId),
      reportingToId: this.parseOptionalString(query.reportingToId),
      sortBy: this.parseSortBy(query.sortBy),
      sortDirection: this.parseSortDirection(query.sortDirection),
    };
  }

  /**
   * Converts employee profile route params into a typed DTO before service logic runs.
   */
  parseProfileParams(params: Record<string, unknown>): GetEmployeeProfileParamsDto {
    const employeeId = this.parseOptionalString(params.employeeId);

    if (!employeeId) {
      throw new Error("Employee id is required");
    }

    return { employeeId };
  }

  /**
   * Converts employee update route params into a typed DTO before service logic runs.
   */
  parseUpdateProfileParams(params: Record<string, unknown>): UpdateEmployeeProfileParamsDto {
    const employeeId = this.parseOptionalString(params.employeeId);

    if (!employeeId) {
      throw new Error("Employee id is required");
    }

    return { employeeId };
  }

  /**
   * Normalizes HR-editable employee profile fields.
   * Undefined fields are ignored, while nullable fields allow HR to clear existing values.
   */
  parseUpdateProfileBody(body: Record<string, unknown>): UpdateEmployeeProfileRequestDto {
    const update: Record<string, unknown> = {};

    this.assignOptionalString(update, "companyEmail", body.companyEmail);
    this.assignOptionalString(update, "firstName", body.firstName);
    this.assignOptionalString(update, "lastName", body.lastName);
    this.assignOptionalNullableString(update, "middleName", body.middleName);
    this.assignOptionalNullableString(update, "personalEmail", body.personalEmail);
    this.assignOptionalNullableDate(update, "birthday", body.birthday);
    this.assignOptionalNullableAddress(update, "address", body.address);
    this.assignOptionalNullableEmergencyContact(update, "emergencyContact", body.emergencyContact);
    this.assignOptionalNullableString(update, "jobTitle", body.jobTitle);
    this.assignOptionalNullableString(update, "department", body.department);
    this.assignOptionalNullableString(update, "supervisorId", body.supervisorId);

    if (body.status !== undefined) {
      update.status = this.parseEmployeeStatus(body.status);
    }

    if (Object.keys(update).length === 0) {
      throw new Error("Employee profile update body is required");
    }

    return update as UpdateEmployeeProfileRequestDto;
  }

  /**
   * Parses a comma-separated id list (e.g. "a,b,c") into a deduped array of trimmed ids.
   * Returns undefined when no ids are present so the filter stays unset.
   */
  private parseIdList(value: unknown): string[] | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const ids = Array.from(
      new Set(
        value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );

    return ids.length > 0 ? ids : undefined;
  }

  /** Returns a trimmed string when present, otherwise leaves the optional filter unset. */
  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /** Parses positive pagination numbers while falling back for missing or invalid values. */
  private parsePositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "string") {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  /** Accepts lowercase or uppercase API status input and converts it to Prisma's enum value. */
  private parseEmployeeStatus(value: unknown): EmployeeStatus | undefined {
    const status = this.parseOptionalString(value)?.toUpperCase();

    if (!status) {
      return undefined;
    }

    if (!Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
      throw new Error("Invalid employee status");
    }

    return status as EmployeeStatus;
  }

  /**
   * Parses a comma-separated status list (e.g. "active,onboarding") into a deduped array of
   * Prisma enum values. Returns undefined when none are present and throws on any invalid value.
   */
  private parseStatusList(value: unknown): EmployeeStatus[] | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const statuses = Array.from(
      new Set(
        value
          .split(",")
          .map((status) => status.trim().toUpperCase())
          .filter((status) => status.length > 0),
      ),
    );

    if (statuses.length === 0) {
      return undefined;
    }

    for (const status of statuses) {
      if (!Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
        throw new Error("Invalid employee status");
      }
    }

    return statuses as EmployeeStatus[];
  }

  /** Accepts known employee directory sort keys and ignores unsupported values. */
  private parseSortBy(value: unknown): EmployeeSortBy | undefined {
    const sortBy = this.parseOptionalString(value);
    return SORT_FIELDS.includes(sortBy as EmployeeSortBy) ? (sortBy as EmployeeSortBy) : undefined;
  }

  /** Normalizes sort direction while defaulting invalid input to ascending behavior. */
  private parseSortDirection(value: unknown): SortDirection | undefined {
    const direction = this.parseOptionalString(value)?.toLowerCase();

    if (direction === "asc" || direction === "desc") {
      return direction;
    }

    return undefined;
  }

  /** Assigns a trimmed required-string-style field only when it is present in the request body. */
  private assignOptionalString<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    value: unknown,
  ) {
    if (value === undefined) {
      return;
    }

    const parsed = this.parseOptionalString(value);

    if (!parsed) {
      throw new Error("Invalid employee profile update");
    }

    target[key] = parsed as T[keyof T];
  }

  /** Assigns a nullable string field, allowing null to clear optional profile data. */
  private assignOptionalNullableString<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    value: unknown,
  ) {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      target[key] = null as T[keyof T];
      return;
    }

    const parsed = this.parseOptionalString(value);
    target[key] = (parsed ?? null) as T[keyof T];
  }

  /** Parses a nullable date field from an ISO string or Date instance. */
  private assignOptionalNullableDate<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    value: unknown,
  ) {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      target[key] = null as T[keyof T];
      return;
    }

    if (typeof value !== "string" && !(value instanceof Date)) {
      throw new Error("Invalid employee birthday");
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid employee birthday");
    }

    target[key] = parsed as T[keyof T];
  }

  /** Parses a nullable structured address update from the request body. */
  private assignOptionalNullableAddress<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    value: unknown,
  ) {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      target[key] = null as T[keyof T];
      return;
    }

    const source = this.parseObject(value);
    const parsed: Record<string, unknown> = {};
    this.assignOptionalNullableString(parsed, "address", source.address);
    this.assignOptionalNullableString(parsed, "city", source.city);
    this.assignOptionalNullableString(parsed, "province", source.province);
    this.assignOptionalNullableString(parsed, "country", source.country);

    if (Object.keys(parsed).length === 0) {
      throw new Error("Invalid employee profile update");
    }

    target[key] = parsed as UpdateEmployeeAddressRequestDto as T[keyof T];
  }

  /** Parses a nullable structured emergency contact update from the request body. */
  private assignOptionalNullableEmergencyContact<T extends Record<string, unknown>>(
    target: T,
    key: keyof T,
    value: unknown,
  ) {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      target[key] = null as T[keyof T];
      return;
    }

    const source = this.parseObject(value);
    const parsed: Record<string, unknown> = {};
    this.assignOptionalNullableString(
      parsed,
      "emergencyContactName",
      source.emergencyContactName,
    );
    this.assignOptionalNullableString(
      parsed,
      "emergencyContactNumber",
      source.emergencyContactNumber,
    );

    if (Object.keys(parsed).length === 0) {
      throw new Error("Invalid employee profile update");
    }

    target[key] = parsed as UpdateEmployeeEmergencyContactRequestDto as T[keyof T];
  }

  /** Ensures nested update payloads are plain request objects. */
  private parseObject(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("Invalid employee profile update");
    }

    return value as Record<string, unknown>;
  }
}
