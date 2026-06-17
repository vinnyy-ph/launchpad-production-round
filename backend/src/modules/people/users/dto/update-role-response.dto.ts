import type { ApiSuccessResponseDto } from "../../../../core/dto";
import type { UserResponseDto } from "./user-response.dto";

export class UpdateRoleResponseDto implements ApiSuccessResponseDto<UserResponseDto> {
  success!: true;
  message?: string;
  data!: UserResponseDto;
}
