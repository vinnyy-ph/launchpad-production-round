export interface ListSurveysQuery {
  page: number;
  limit: number;
  status?: "draft" | "active" | "inactive";
}
