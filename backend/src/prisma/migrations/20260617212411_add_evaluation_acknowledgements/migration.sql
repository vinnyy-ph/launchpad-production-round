-- AlterTable
ALTER TABLE "evaluation_acknowledgements" ALTER COLUMN "acknowledgedAt" DROP NOT NULL,
ALTER COLUMN "acknowledgedAt" DROP DEFAULT;
