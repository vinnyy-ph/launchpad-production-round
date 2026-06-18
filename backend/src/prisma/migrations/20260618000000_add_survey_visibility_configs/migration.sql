-- CreateTable
CREATE TABLE "survey_visibility_configs" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_visibility_configs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "survey_visibility_configs" ADD CONSTRAINT "survey_visibility_configs_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_visibility_configs" ADD CONSTRAINT "survey_visibility_configs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
