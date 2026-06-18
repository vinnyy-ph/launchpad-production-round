import { OccurrencesRepository } from "./occurrences.repository";
import type { OccurrenceDetail } from "./occurrences.types";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";

export class OccurrencesService {
  constructor(private readonly repository = new OccurrencesRepository()) {}

  async getOccurrence(id: string): Promise<OccurrenceDetail> {
    const occurrence = await this.repository.findById(id);
    if (!occurrence) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }
    return occurrence;
  }
}
