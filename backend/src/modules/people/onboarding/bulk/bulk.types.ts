
import type { OnboardEmployeeDataDto, OnboardEmployeeRequestDto } from "../dto";

export type BulkOnboardingRowInput = OnboardEmployeeRequestDto & {
  rowNumber: number;
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
