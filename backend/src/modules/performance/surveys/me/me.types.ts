export interface PendingSurveyItem {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  deadline: Date;
  occurrenceNumber: number;
  questions: any[];
}
