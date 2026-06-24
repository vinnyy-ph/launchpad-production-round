-- CreateTable
CREATE TABLE "offboarding_attachments" (
    "id" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offboarding_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offboarding_attachments_offboardingId_idx" ON "offboarding_attachments"("offboardingId");

-- AddForeignKey
ALTER TABLE "offboarding_attachments" ADD CONSTRAINT "offboarding_attachments_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "offboarding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single attachments into the new one-to-many table.
INSERT INTO "offboarding_attachments" ("id", "offboardingId", "url", "fileName", "createdAt")
SELECT gen_random_uuid(), "id", "attachmentUrl", 'attachment', "createdAt"
FROM "offboarding_records"
WHERE "attachmentUrl" IS NOT NULL;

-- DropColumn
ALTER TABLE "offboarding_records" DROP COLUMN "attachmentUrl";
