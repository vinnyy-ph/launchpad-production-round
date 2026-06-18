-- Evaluation Period: free-text string -> date range.
-- periodStart/periodEnd are NOT NULL; add with a transient default to backfill any
-- existing rows, then drop the default so the column matches the (default-less) schema.
ALTER TABLE "performance_evaluations" DROP COLUMN "evaluationPeriod";
ALTER TABLE "performance_evaluations" ADD COLUMN "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "performance_evaluations" ALTER COLUMN "periodStart" DROP DEFAULT;
ALTER TABLE "performance_evaluations" ADD COLUMN "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "performance_evaluations" ALTER COLUMN "periodEnd" DROP DEFAULT;

-- Highlights / Lowlights: single nullable text -> itemized string arrays.
-- Prisma maps String[] to a plain (nullable) TEXT[] column (see respondentTeamIds in init).
ALTER TABLE "performance_evaluations" DROP COLUMN "highlights";
ALTER TABLE "performance_evaluations" ADD COLUMN "highlights" TEXT[];
ALTER TABLE "performance_evaluations" DROP COLUMN "lowlights";
ALTER TABLE "performance_evaluations" ADD COLUMN "lowlights" TEXT[];
