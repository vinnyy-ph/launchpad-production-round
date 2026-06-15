import { Router } from "express";
import { authenticate } from "../middleware/authenticate";

// Aggregate router. Each module skill registers its sub-router here, e.g.:
//   import { peopleRouter } from "../modules/people/people.routes";
//   router.use("/people", peopleRouter);
export const router = Router();

router.get("/", (_req, res) => res.json({ message: "ERP API" }));

// Returns the authenticated app user — exercises the auth layer end-to-end.
router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));
