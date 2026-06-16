import cors from "cors";
import express from "express";
import { API_ROUTES } from "./core/globals";
import { authenticate } from "./core/middleware/auth.middleware";
import { employeesRouter } from "./modules/people/employees";

export const app = express();

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "healthy" }));
app.get(API_ROUTES.ROOT, (_req, res) =>
  res.json({
    message: "ERP API",
    version: API_ROUTES.VERSION,
    basePath: API_ROUTES.VERSIONED_ROOT,
  }),
);
app.get(`${API_ROUTES.VERSIONED_ROOT}/me`, authenticate, (req, res) => res.json({ user: req.user }));
app.use(`${API_ROUTES.VERSIONED_ROOT}/employees`, employeesRouter);
