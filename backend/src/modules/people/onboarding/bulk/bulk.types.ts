
import type { OnboardEmployeeDataDto, OnboardEmployeeRequestDto } from "../dto";

export type BulkOnboardingRowInput = Omit<OnboardEmployeeRequestDto, "supervisorId"> & {
  rowNumber: number;
  supervisorId?: string;
  supervisorEmail?: string;
};

export interface BulkOnboardingRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface BulkOnboardingPreviewData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: BulkOnboardingRowError[];
  rows: BulkOnboardingPreviewRow[];
}

export interface BulkOnboardingPreviewRow {
  rowNumber: number;
  employeeName: string;
  companyEmail: string;
  jobTitle: string;
  department: string;
  supervisorEmail: string | null;
  supervisorName: string | null;
  status: "valid" | "invalid";
}

export interface ParsedBulkOnboardingRows {
  totalRows: number;
  rows: BulkOnboardingRowInput[];
  errors: BulkOnboardingRowError[];
}

export interface BulkOnboardingCommitData {
  created: OnboardEmployeeDataDto[];
  inviteFailures: BulkOnboardingRowError[];
}
