import { MeRepository } from "./me.repository";
import type { AnsweredSurveyItem, PendingSurveyItem } from "./me.types";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { advanceDueOccurrences } from "../occurrences/occurrence-scheduler";
import { sweepPulseReminders } from "../reminders/reminders.service";
import { sweepEvalAckReminders } from "../../evaluations/ack-reminders";

export class MeService {
  constructor(private readonly repository = new MeRepository()) {}

  async getPendingSurveys(userId: string): Promise<PendingSurveyItem[]> {
    // Lazy recurrence (PER-09): materialize any due occurrences for active recurring
    // surveys before listing, so a new period appears here without a background daemon.
    // Never block the read on a scheduler hiccup.
    await advanceDueOccurrences().catch(() => undefined);

    // Lazy reminder fan-out (PER-07): this employee-surface tick reminds every pulse
    // non-responder and every reviewee with a still-pending evaluation, across the whole
    // org. Both guarded so a sweep hiccup never blocks the read.
    await sweepPulseReminders().catch(() => undefined);
    await sweepEvalAckReminders().catch(() => undefined);

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
}
