export interface OccurrenceDetail {
  id: string;
  surveyId: string;
  occurrenceNumber: number;
  releaseDate: Date;
  deadline: Date;
  isClosed: boolean;
  audienceSize: number;
  completionCount: number;
  createdAt: Date;
  updatedAt: Date;
}
