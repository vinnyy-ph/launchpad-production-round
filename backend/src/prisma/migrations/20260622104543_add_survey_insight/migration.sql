-- CreateTable
CREATE TABLE "survey_insights" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseCount" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_insights_surveyId_idx" ON "survey_insights"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_insights_surveyId_scopeKey_key" ON "survey_insights"("surveyId", "scopeKey");

-- AddForeignKey
ALTER TABLE "survey_insights" ADD CONSTRAINT "survey_insights_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
