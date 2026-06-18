import type { NextFunction, Request, Response } from "express";
import type { ApiSuccessResponseDto } from "../../../../core/dto";
import { HTTP_STATUS_CODES } from "../../../../core/globals";
import { ResponsesRepository } from "./responses.repository";
import { RESPOND_ERRORS, ResponsesService } from "./responses.service";
import { parseAnswers } from "./responses.validation";

type ErrorBody = { success: false; message: string };

const STATUS_BY_MESSAGE: Record<string, number> = {
  [RESPOND_ERRORS.EMPLOYEE_NOT_FOUND]: HTTP_STATUS_CODES.NOT_FOUND,
  [RESPOND_ERRORS.OCCURRENCE_NOT_FOUND]: HTTP_STATUS_CODES.NOT_FOUND,
  [RESPOND_ERRORS.OCCURRENCE_CLOSED]: HTTP_STATUS_CODES.CONFLICT,
  [RESPOND_ERRORS.NOT_IN_AUDIENCE]: HTTP_STATUS_CODES.FORBIDDEN,
  [RESPOND_ERRORS.ALREADY_RESPONDED]: HTTP_STATUS_CODES.CONFLICT,
};

/** HTTP controller for pulse responses. */
export class ResponsesController {
  constructor(private readonly service = new ResponsesService(new ResponsesRepository())) {}

  /** POST /pulse/occurrences/:occurrenceId/respond — submit answers for the signed-in employee. */
  respond = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<null> | ErrorBody>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({ success: false, message: "Not authenticated" });
      }

      const { occurrenceId } = req.params;
      const rawAnswers = (req.body as { answers?: unknown } | undefined)?.answers;

      let answers;
      try {
        answers = parseAnswers(rawAnswers);
      } catch (validationError) {
        return res
          .status(HTTP_STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: (validationError as Error).message });
      }

      await this.service.respond({ userId, occurrenceId, answers });
      return res
        .status(HTTP_STATUS_CODES.CREATED)
        .json({ success: true, message: "Response submitted", data: null });
    } catch (error) {
      if (error instanceof Error) {
        const status = STATUS_BY_MESSAGE[error.message];
        if (status) return res.status(status).json({ success: false, message: error.message });
      }
      return next(error);
    }
  };
}
