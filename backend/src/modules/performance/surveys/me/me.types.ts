export interface PendingSurveyItem {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  isAnonymous: boolean;
  deadline: Date;
  occurrenceNumber: number;
  questions: any[];
}

export interface AnsweredSurveyItem {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  isAnonymous: boolean;
  occurrenceNumber: number;
  completedAt: Date;
}
