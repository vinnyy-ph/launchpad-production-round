-- Anonymous self-view: link each completion to the response it produced, so the AUTHOR can
-- recover their own answers even for anonymous responses (whose employeeId is null on
-- survey_responses). The link is read only by the self-scoped anonymous self-view; no
-- results/drill-down/insights reader traverses it. Nullable for completions recorded before
-- the link existed (those responses are unrecoverable by design).

-- AlterTable
ALTER TABLE "survey_completions" ADD COLUMN     "responseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "survey_completions_responseId_key" ON "survey_completions"("responseId");

-- AddForeignKey
ALTER TABLE "survey_completions" ADD CONSTRAINT "survey_completions_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
