import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moves CLI connection config out of schema.prisma. The CLI (migrate,
// db push) uses the direct/unpooled Neon URL here; the runtime client uses the
// pooled DATABASE_URL from the schema datasource.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
});
