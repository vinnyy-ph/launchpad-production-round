import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** One configured signatory on a clearance version, with the resolved employee. */
export interface ClearanceTemplateSignatoryDto {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
  };
  purpose: string;
  requirements: string;
  order: number;
}

/** A clearance version (template) with its ordered signatories. */
export interface ClearanceTemplateDto {
  id: string;
  name: string;
  isDefault: boolean;
  /** Number of offboarding cases currently using this version (blocks deletion when > 0). */
  inUseCount: number;
  signatories: ClearanceTemplateSignatoryDto[];
  createdAt: string;
  updatedAt: string;
}

/** Response for the single-version create / update / set-default endpoints. */
export type ClearanceTemplateResponseDto = ApiSuccessResponseDto<ClearanceTemplateDto>;

/** Response for GET /api/v1/clearance-templates. */
export type ListClearanceTemplatesResponseDto = ApiSuccessResponseDto<
  ClearanceTemplateDto[]
>;
