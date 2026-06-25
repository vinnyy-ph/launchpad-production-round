import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES } from "../../core/globals";
import { CloudinaryService } from "../../core/cloudinary";

/**
 * Streams authenticated Cloudinary documents through our own origin so they render inline
 * in the app's document viewer. The signed token in the URL is the capability — it is minted
 * only after the originating module authorizes the viewer, scopes access to a single
 * document, and expires shortly. The route is therefore intentionally not behind the
 * Firebase `authenticate` middleware: it is loaded by <iframe>/<img> and "open in new tab",
 * none of which carry the Bearer token.
 */
export class DocumentsController {
  constructor(
    private readonly cloudinaryService = new CloudinaryService(),
  ) {}

  view = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const target = token
        ? this.cloudinaryService.verifyProxyToken(token)
        : null;

      if (!target) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: "This document link is invalid or has expired.",
        });
      }

      const file = await this.cloudinaryService.fetchDocument(target);

      if (!file) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: "Document not found.",
        });
      }

      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", file.inline ? "inline" : "attachment");
      res.setHeader("Cache-Control", "private, max-age=600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (file.contentLength) {
        res.setHeader("Content-Length", file.contentLength);
      }

      file.stream.on("error", next);
      file.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  };
}
