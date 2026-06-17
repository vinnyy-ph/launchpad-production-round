import cors from "cors";
import express from "express";
import { API_ROUTES } from "./core/globals";
import { authenticate } from "./core/middleware/auth.middleware";
import { employeesRouter } from "./modules/people/employees";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { authLimiter, globalLimiter } from "./core/middleware/rate-limit.middleware";
import { swaggerSpec } from "./docs/swagger.config";
import { authRoutes } from "./modules/auth";
import { dashboardRoutes } from "./modules/dashboard";
import { usersRouter } from "./modules/people/users";
import { onboardingRouter } from "./modules/people/onboarding";
import { employeeOnboardingRouter } from "./modules/people/onboarding/employee-onboarding";
import { pulseSurveysRouter } from "./modules/performance/surveys";

export const app = express();

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

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

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(globalLimiter);

app.get("/api", (_req, res) => res.json({ message: "ERP API" }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get(API_ROUTES.ROOT, (_req, res) =>
  res.json({
    message: "ERP API",
    version: API_ROUTES.VERSION,
    basePath: API_ROUTES.VERSIONED_ROOT,
  }),
);
app.get(`${API_ROUTES.VERSIONED_ROOT}/me`, authenticate, (req, res) => res.json({ user: req.user }));
app.use(`${API_ROUTES.VERSIONED_ROOT}/users`, authenticate, usersRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/employees`, employeesRouter);
app.use(`${API_ROUTES.VERSIONED_ROOT}/onboarding`, authenticate, onboardingRouter);
app.use(
  `${API_ROUTES.VERSIONED_ROOT}/employee-onboarding`,
  authenticate,
  employeeOnboardingRouter,
);
app.use(`${API_ROUTES.VERSIONED_ROOT}/pulse`, pulseSurveysRouter);
