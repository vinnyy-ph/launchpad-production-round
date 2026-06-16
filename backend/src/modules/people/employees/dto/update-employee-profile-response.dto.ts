import type { ApiSuccessResponseDto } from "../../../../core/dto";
import type { EmployeeProfileDto } from "./employee-profile-response.dto";

/**
 * Success envelope returned after HR edits an employee profile.
 */
export type UpdateEmployeeProfileResponseDto = ApiSuccessResponseDto<EmployeeProfileDto>;
