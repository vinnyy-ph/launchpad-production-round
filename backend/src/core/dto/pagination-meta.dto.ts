/**
 * Pagination metadata returned alongside paginated collections.
 */
export class PaginationMetaDto {
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}
