import { MeRepository } from "./me.repository";
import type { AnsweredSurveyItem, MyAnswerItem, MyAnswersDetail, PendingSurveyItem } from "./me.types";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { advanceDueOccurrences } from "../occurrences/occurrence-scheduler";

export class MeService {
  constructor(private readonly repository = new MeRepository()) {}

  async getPendingSurveys(userId: string): Promise<PendingSurveyItem[]> {
    // Lazy recurrence (PER-09): materialize any due occurrences for active recurring
    // surveys before listing, so a new period appears here without a background daemon.
    // Never block the read on a scheduler hiccup.
    await advanceDueOccurrences().catch(() => undefined);

    // Pulse reminders run on their own Railway daily cron (`cron:survey-reminder`), not on
    // this read path — so non-responders are reminded on cadence without depending on anyone
    // loading their surveys page.

    const employeeId = await this.repository.findEmployeeIdByUserId(userId);
    if (!employeeId) {
      throw new Error(SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE);
    }

    return this.repository.findPendingSurveys(employeeId, new Date());
  }

  async getAnsweredSurveys(userId: string): Promise<AnsweredSurveyItem[]> {
    const employeeId = await this.repository.findEmployeeIdByUserId(userId);
    if (!employeeId) {
      throw new Error(SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE);
    }

    return this.repository.findAnsweredSurveys(employeeId);
  }

  /** The employee's own answers for one completed occurrence (PER-23). */
  async getMyAnswers(userId: string, occurrenceId: string): Promise<MyAnswersDetail> {
    const employeeId = await this.repository.findEmployeeIdByUserId(userId);
    if (!employeeId) {
      throw new Error(SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE);
    }

    const occurrence = await this.repository.findOccurrenceForMyAnswers(occurrenceId);
    if (!occurrence) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }

    const base = {
      occurrenceId,
      surveyId: occurrence.surveyId,
      surveyName: occurrence.surveyName,
      occurrenceNumber: occurrence.occurrenceNumber,
      isAnonymous: occurrence.isAnonymous,
    };

    // Did the caller actually answer this occurrence? Completion is tracked separately from
    // the (possibly anonymized) response, so it holds for anonymous surveys too. Identity
    // comes from the session, never the request.
    const completed = await this.repository.hasCompleted(occurrenceId, employeeId);
    if (!completed) {
      // In the audience but not yet responded → clean "no submission", not an error.
      // Outside the audience → 404, so a non-recipient can't probe survey names by occurrence id.
      const inAudience = await this.repository.isAudienceMember(occurrenceId, employeeId);
      if (!inAudience) {
        throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
      }
      return { ...base, submitted: false, answers: [] };
    }

    // Anonymity firewall: an anonymous response has no employee link, so the content is
    // unrecoverable by design. Confirm submission, return no answers — never re-identify.
    if (occurrence.isAnonymous) {
      return { ...base, submitted: true, answers: [] };
    }

    const rows = await this.repository.findMyAnswers(occurrenceId, employeeId);
    const byQuestion = new Map(rows.map((r) => [r.questionId, r]));
    const answers: MyAnswerItem[] = occurrence.questions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleMinLabel: q.scaleMinLabel,
      scaleMaxLabel: q.scaleMaxLabel,
      answerText: byQuestion.get(q.id)?.answerText ?? null,
      answerData: byQuestion.get(q.id)?.answerData ?? null,
    }));

    return { ...base, submitted: true, answers };
  }
}
