-- Notification center: user pinning + soft-delete (archive).
-- pinnedAt/deletedAt are nullable; isPinned defaults false so existing rows are unaffected.
ALTER TABLE "notifications"
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinnedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);
