import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { authenticate } from "./core/middleware/auth.middleware";
import { API_ROUTES } from "./core/globals";
import { employeesRouter } from "./modules/people/employees";
import { departmentsRouter } from "./modules/people/departments";
import { teamsRouter } from "./modules/people/teams";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import {
  authLimiter,
  globalLimiter,
} from "./core/middleware/rate-limit.middleware";
import { swaggerSpec } from "./docs/swagger.config";
import { authRoutes } from "./modules/auth";
import { dashboardRoutes } from "./modules/dashboard";
import { evaluationsRouter } from "./modules/performance/evaluations";
import { usersRouter } from "./modules/people/users";
import { onboardingRouter } from "./modules/people/onboarding";
import { employeeOnboardingRouter } from "./modules/people/onboarding/employee-onboarding";
import { offboardingRouter } from "./modules/people/offboarding";
import { clearanceRouter } from "./modules/people/offboarding/clearance";
import { clearanceTemplatesRouter } from "./modules/people/offboarding/clearance-templates";
import { pulseSurveysRouter } from "./modules/performance/surveys";
import { notificationsRouter } from "./modules/notifications";
import { supervisorOnboardingRouter } from "./modules/people/onboarding/supervisor-onboarding";
import {
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "./core/globals";

export const app = express();

if (process.env.NODE_ENV === "production") {
  // Railway sits behind one reverse proxy; required so rate limits use the real client IP.
  app.set("trust proxy", 1);
}

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "healthy" }));

if (process.env.NODE_ENV !== "production") {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use(globalLimiter);

app.get("/api", (_req, res) => res.json({ message: "ERP API" }));
app.get("/api/me", authenticate, (req, res) => res.json({ user: req.user }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/evaluations`,
  authenticate,
  evaluationsRouter,
);

app.get(API_ROUTES.ROOT, (_req, res) =>
  res.json({
    message: "ERP API",
    version: API_ROUTES.VERSION,
    basePath: API_ROUTES.VERSIONED_ROOT,
  }),
);
app.get(`${API_ROUTES.VERSIONED_ROOT}/me`, authenticate, (req, res) =>
  res.json({ user: req.user }),
);

app.use(`${API_ROUTES.VERSIONED_ROOT}/users`, authenticate, usersRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/departments`, authenticate, departmentsRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/employees`, authenticate, employeesRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/teams`, authenticate, teamsRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/onboarding`, authenticate, onboardingRouter);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/employee-onboarding`,
  authenticate,
  employeeOnboardingRouter,
);
app.use(`${API_ROUTES.VERSIONED_ROOT}/pulse`, pulseSurveysRouter);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/notifications`,
  authenticate,
  notificationsRouter,
);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/supervisor-onboarding`,
  authenticate,
  supervisorOnboardingRouter,
);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/offboarding`,
  authenticate,
  offboardingRouter,
);
app.use(`${API_ROUTES.VERSIONED_ROOT}/clearance`, authenticate, clearanceRouter);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/clearance-templates`,
  authenticate,
  clearanceTemplatesRouter,
);

/** Fallback for unhandled errors — returns JSON instead of a blank 500 page. */
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  if (res.headersSent) {
    return;
  }

  return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  });
});
