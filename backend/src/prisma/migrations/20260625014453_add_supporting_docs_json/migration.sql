-- Add the new JSON column
ALTER TABLE "performance_evaluations"
  ADD COLUMN "supportingDocs" JSONB NOT NULL DEFAULT '[]';

-- Backfill: each existing Cloudinary public_id becomes a file entry.
-- label = the segment after the last "/" in the public_id.
UPDATE "performance_evaluations" e
SET "supportingDocs" = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'kind', 'file',
      'url', u,
      'label', regexp_replace(u, '^.*/', '')
    )
  )
  FROM unnest(e."supportingDocUrls") AS u
), '[]'::jsonb)
WHERE array_length(e."supportingDocUrls", 1) IS NOT NULL;

-- Drop the old array column
ALTER TABLE "performance_evaluations" DROP COLUMN "supportingDocUrls";

-- Drop the stray singular column (drift artifact from a modified migration)
ALTER TABLE "performance_evaluations" DROP COLUMN IF EXISTS "supportingDocUrl";

-- Fix index rename detected by prisma migrate diff
ALTER INDEX IF EXISTS "onboarding_invitation_resend_attempts_invitationId_attemptedAt_" RENAME TO "onboarding_invitation_resend_attempts_invitationId_attempte_idx";
