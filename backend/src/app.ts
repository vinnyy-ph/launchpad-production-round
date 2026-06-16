import cors from "cors";
import express from "express";
import { authenticate } from "./core/middleware/auth.middleware";
import { evaluationsRouter } from "./modules/performance/evaluations";

export const app = express();

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api", (_req, res) => res.json({ message: "ERP API" }));
app.get("/api/me", authenticate, (req, res) => res.json({ user: req.user }));

app.use("/api/evaluations", evaluationsRouter);
