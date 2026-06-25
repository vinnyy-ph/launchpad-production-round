import type { ApiSuccessResponseDto } from "../../../../core/dto";

/**
 * User payload returned after create or deactivate actions.
 */
export interface UserResponseDto {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  employeeId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  employeeStatus: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateUserResponseDto implements ApiSuccessResponseDto<UserResponseDto> {
  success!: true;
  message?: string;
  data!: UserResponseDto;
}

export class DeactivateUserResponseDto implements ApiSuccessResponseDto<UserResponseDto> {
  success!: true;
  message?: string;
  data!: UserResponseDto;
}

export class ActivateUserResponseDto implements ApiSuccessResponseDto<UserResponseDto> {
  success!: true;
  message?: string;
  data!: UserResponseDto;
}
