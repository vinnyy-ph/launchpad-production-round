-- Defensive reconcile (idempotent).
--
-- Some dev/staging databases were bootstrapped with `prisma db push` from an earlier model
-- where PulseSurvey still carried releaseDate/deadline (and a deletedAt). The model has since
-- moved those dates onto SurveyOccurrence, so the current PulseSurvey model declares none of
-- them. The committed migration history NEVER created these columns, so on any database built
-- purely from `migrate deploy` this migration is a safe no-op. On a db-push-drifted database it
-- drops the orphaned columns so the schema matches the model (and the seed's pulseSurvey.create
-- — which omits releaseDate — stops hitting the NOT NULL constraint).
ALTER TABLE "pulse_surveys" DROP COLUMN IF EXISTS "releaseDate";
ALTER TABLE "pulse_surveys" DROP COLUMN IF EXISTS "deadline";
ALTER TABLE "pulse_surveys" DROP COLUMN IF EXISTS "deletedAt";
