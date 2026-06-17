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

export type QuestionType = "RATING" | "SINGLE" | "MULTI" | "TEXT";
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // for SINGLE / MULTI
}
export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type Recurrence = "NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  audience: string; // "All employees" | a department | a team name
  anonymous: boolean;
  minGroupSize: number;
  recurrence: Recurrence;
  status: SurveyStatus;
  createdAt: string;
}
export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string; // omitted from results display when anonymous
  answers: Record<string, string | string[] | number>;
  submittedAt: string;
}

export type EvaluationStatus = "DRAFT" | "SHARED" | "ACKNOWLEDGED";
export interface EvaluationRating {
  competency: string;
  score: number; // 1-5
}
export interface Evaluation {
  id: string;
  employeeId: string;
  supervisorId: string;
  period: string; // "H1 2026"
  status: EvaluationStatus;
  ratings: EvaluationRating[];
  summary: string;
  sharedAt: string | null;
}
export interface Acknowledgement {
  id: string;
  evaluationId: string;
  employeeId: string;
  acknowledgedAt: string | null;
  deemedAt: string | null; // "deemed acknowledged" after a deadline
}
