import { Router } from "express";
import { DocumentsController } from "./documents.controller";

const router = Router();
const controller = new DocumentsController();

// `:filename` is decorative (drives the viewer's PDF detection and the download name); the
// document identity and authorization live in the signed `token` query param.
router.get("/view/:filename", controller.view);

export { router as documentsRouter };
