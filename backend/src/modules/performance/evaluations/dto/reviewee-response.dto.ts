/** A selectable reviewee = one of the current supervisor's active direct reports. */
export interface RevieweeResponseDto {
  id: string;
  fullName: string;
  jobTitle: string | null;
}

export interface ListRevieweesResponseDto {
  success: true;
  data: RevieweeResponseDto[];
}
