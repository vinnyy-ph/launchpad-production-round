import cors from "cors";
import express from "express";
import { authRoutes } from "./modules/auth";
import { dashboardRoutes } from "./modules/dashboard";

export const app = express();

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api", (_req, res) => res.json({ message: "ERP API" }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
