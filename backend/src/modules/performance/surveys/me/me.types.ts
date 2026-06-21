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

export interface MyAnswerItem {
  questionId: string;
  questionText: string;
  type: string;
  options: unknown;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  answerText: string | null;
  answerData: unknown;
}

export interface MyAnswersDetail {
  occurrenceId: string;
  surveyId: string;
  surveyName: string;
  occurrenceNumber: number;
  isAnonymous: boolean;
  /** Empty for anonymous surveys — individual content is unrecoverable by design. */
  answers: MyAnswerItem[];
}
