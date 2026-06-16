import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { authLimiter, globalLimiter } from "./core/middleware/rate-limit.middleware";
import { swaggerSpec } from "./docs/swagger.config";
import { authRoutes } from "./modules/auth";
import { dashboardRoutes } from "./modules/dashboard";

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
