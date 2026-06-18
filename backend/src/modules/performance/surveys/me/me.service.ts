import { MeRepository } from "./me.repository";
import type { PendingSurveyItem } from "./me.types";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";

export class MeService {
  constructor(private readonly repository = new MeRepository()) {}

  async getPendingSurveys(userId: string): Promise<PendingSurveyItem[]> {
    const employeeId = await this.repository.findEmployeeIdByUserId(userId);
    if (!employeeId) {
      throw new Error(SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE);
    }

    return this.repository.findPendingSurveys(employeeId, new Date());
  }
}
