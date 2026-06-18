/**
 * Structured address details returned with an HR employee profile.
 */
export interface EmployeeAddressResponseDto {
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}
