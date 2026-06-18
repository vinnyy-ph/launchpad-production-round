export type QuestionResult =
  | {
      questionId: string;
      type: "SHORT_ANSWER" | "LONG_ANSWER";
      questionText: string;
      responseCount: number;
      responses: string[];
    }
  | {
      questionId: string;
      type: "LINEAR_SCALE";
      questionText: string;
      responseCount: number;
      average: number;
      min: number;
      max: number;
      distribution: Record<string, number>;
    }
  | {
      questionId: string;
      type: "MULTIPLE_CHOICE" | "CHECKBOX";
      questionText: string;
      responseCount: number;
      counts: Record<string, number>;
    };

export interface SurveyResultsResponseDto {
  success: boolean;
  data: {
    surveyId: string;
    occurrenceId?: string; // only on the occurrence-level endpoint
    isAnonymous: boolean;
    totalResponses: number;
    filter: { teamId?: string; supervisorId?: string } | null;
    suppressed: boolean; // true when min-group-size rule fired
    questions: QuestionResult[]; // empty when suppressed = true
  };
}
