import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

// Module routers mount under /api (see src/routes/index.ts).
app.use("/api", router);

// Liveness probe.
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
