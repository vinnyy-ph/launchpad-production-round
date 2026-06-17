export interface ListEvaluationsQuery {
  page: number;
  limit: number;
  status?: "draft" | "sent";
}
