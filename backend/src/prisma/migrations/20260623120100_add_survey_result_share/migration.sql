-- CreateTable
CREATE TABLE "survey_result_shares" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_result_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_result_shares_occurrenceId_teamId_key" ON "survey_result_shares"("occurrenceId", "teamId");

-- AddForeignKey
ALTER TABLE "survey_result_shares" ADD CONSTRAINT "survey_result_shares_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "survey_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_result_shares" ADD CONSTRAINT "survey_result_shares_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_result_shares" ADD CONSTRAINT "survey_result_shares_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_result_shares" ADD CONSTRAINT "survey_result_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
