// Mock entity shapes shared across the demo. Screens read these collections via
// readCollection<T>(name) / writeCollection<T>(name, rows) from "@/shared/mock/db".
// Collection names (the string keys in buildSeed): employees, users, teams,
// onboardingCases, offboardingCases, surveys, surveyResponses, evaluations,
// acknowledgements, notifications.

export type Role = "ADMIN" | "HR" | "EMPLOYEE";
export type EmployeeStatus = "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE";

export interface DemoEmployee {
  employeeId: string;
  userId: string;
  displayName: string;
  email: string;
  role: Role;
  isSupervisor: boolean;
  isActive: boolean;
  jobTitle: string;
  department: string;
  employeeStatus: EmployeeStatus;
  supervisorId: string | null; // employeeId of supervisor
  teamId: string | null;
  startDate: string; // ISO date
}

export interface UserAccount {
  id: string;
  employeeId: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastActiveAt: string;
}

export interface Team {
  id: string;
  name: string;
  parentId: string | null;
  leadEmployeeId: string | null;
  memberIds: string[]; // employeeIds
}

export type OnboardingStatus = "INVITED" | "IN_PROGRESS" | "DOCS_REVIEW" | "COMPLETE";
export type DocStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
export interface OnboardingDocument {
  name: string;
  status: DocStatus;
}
export interface OnboardingCustomField {
  label: string;
  value: string;
}
export interface OnboardingCase {
  id: string;
  employeeId: string;
  status: OnboardingStatus;
  progress: number; // 0-100
  customFields: OnboardingCustomField[];
  documents: OnboardingDocument[];
  invitedAt: string;
}

export type ClearanceStatus = "PENDING" | "SIGNED" | "REJECTED";
export interface Clearance {
  dept: string;
  ownerEmployeeId: string; // who must sign
  status: ClearanceStatus;
  note?: string;
}
export type OffboardingStatus = "INITIATED" | "CLEARANCES" | "COMPLETE";
export interface OffboardingCase {
  id: string;
  employeeId: string;
  status: OffboardingStatus;
  lastDay: string;
  reason: string;
  clearances: Clearance[];
}

// RATING = Linear Scale · SINGLE = Multiple choice · MULTI = Checkbox · TEXT = Short/Long answer.
export type QuestionType = "RATING" | "SINGLE" | "MULTI" | "TEXT";
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // for SINGLE / MULTI
  // RATING (linear scale)
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  // TEXT
  multiline?: boolean;
  maxChars?: number;
  required?: boolean;
}
export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type Recurrence = "NONE" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "BI_MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
export type AudienceType = "EVERYONE" | "SUPERVISOR_BASED" | "SPECIFIC_TEAMS";
export type VisibilityScope = "ADMIN_ONLY" | "HR_ADMIN" | "SUPERVISOR_BASED" | "TEAM_LEADS" | "EVERYONE";
export type ReminderType = "NONE" | "DAILY" | "EVERY_X_DAYS" | "WEEKLY";
export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  anonymous: boolean;
  minGroupSize: number;
  recurrence: Recurrence;
  status: SurveyStatus;
  createdAt: string;
  // Audience targeting
  audienceType?: AudienceType;
  audienceTeamIds?: string[];      // SPECIFIC_TEAMS
  audienceSupervisorId?: string;   // SUPERVISOR_BASED (downward chain root)
  audience?: string;               // legacy human label (kept for back-compat)
  // Schedule
  releaseDate?: string;
  deadline?: string;               // first occurrence deadline (> releaseDate)
  reminderType?: ReminderType;
  reminderIntervalDays?: number;   // when reminderType = EVERY_X_DAYS
  // Result visibility (default SUPERVISOR_BASED)
  visibilityScope?: VisibilityScope;
}
export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string; // omitted from results display when anonymous
  answers: Record<string, string | string[] | number>;
  submittedAt: string;
}

export type EvaluationStatus = "DRAFT" | "SHARED" | "ACKNOWLEDGED" | "DEEMED_ACKNOWLEDGED";
export interface EvaluationRating {
  competency: string;
  score: number; // 1-5
}
// Grade scale: 1 Unsatisfactory · 2 Needs improvement · 3 Meets · 4 Exceeds · 5 Exceptional.
export interface Evaluation {
  id: string;
  employeeId: string;
  supervisorId: string;
  period: string; // "H1 2026"
  status: EvaluationStatus;
  sharedAt: string | null;
  // Rich evaluation content
  grade?: number;              // 1-5
  highlights?: string[];
  lowlights?: string[];
  evaluationText?: string;
  recommendationText?: string;
  supportingDocs?: string[];   // doc names / urls
  ackDeadline?: string | null; // sharedAt + N days; deemed-acknowledged after
  // Legacy (kept for back-compat with the first editor)
  ratings?: EvaluationRating[];
  summary?: string;
}
export interface Acknowledgement {
  id: string;
  evaluationId: string;
  employeeId: string;
  acknowledgedAt: string | null;
  deemedAt: string | null; // "deemed acknowledged" after the ack deadline
}
