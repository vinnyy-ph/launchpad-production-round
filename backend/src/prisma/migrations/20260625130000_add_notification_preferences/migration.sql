-- Per-employee notification delivery preferences.
-- One row per employee; an absent row means all-on (the default), so existing
-- employees need no backfill. Evaluations in-app and offboarding/clearance email
-- are intentionally not stored (locked-on / no-email-exists respectively).
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "surveysInApp" BOOLEAN NOT NULL DEFAULT true,
    "surveysEmail" BOOLEAN NOT NULL DEFAULT true,
    "evaluationsEmail" BOOLEAN NOT NULL DEFAULT true,
    "onboardingInApp" BOOLEAN NOT NULL DEFAULT true,
    "onboardingEmail" BOOLEAN NOT NULL DEFAULT true,
    "offboardingInApp" BOOLEAN NOT NULL DEFAULT true,
    "pauseAllEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_employeeId_key" ON "notification_preferences"("employeeId");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
