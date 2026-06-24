-- HR's open-text note to a small-team supervisor (SYS-005 rework).
-- The supervisor reads this note instead of the raw anonymous breakdown.
ALTER TABLE "survey_result_shares" ADD COLUMN "message" TEXT NOT NULL DEFAULT '';
