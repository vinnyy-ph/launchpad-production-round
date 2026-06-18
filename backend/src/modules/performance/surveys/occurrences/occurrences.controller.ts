import type { NextFunction, Request, Response } from "express";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
  API_SUCCESS_MESSAGES,
} from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { OccurrencesService } from "./occurrences.service";

export class OccurrencesController {
  constructor(private readonly service = new OccurrencesService()) {}

  getOccurrence = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { occurrenceId } = req.params;
      const occurrence = await this.service.getOccurrence(occurrenceId);

      res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: API_SUCCESS_MESSAGES.OCCURRENCE_RETRIEVED,
        data: occurrence,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND) {
          res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
            errorCode: API_ERROR_CODES.OCCURRENCE_NOT_FOUND,
          });
          return;
        }
      }
      next(error);
    }
  };
}
