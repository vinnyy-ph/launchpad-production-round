-- AlterTable
ALTER TABLE "performance_evaluations" DROP COLUMN "supportingDocUrl",
ADD COLUMN "supportingDocUrls" TEXT[] NOT NULL DEFAULT '{}';