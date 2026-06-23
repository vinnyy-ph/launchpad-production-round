-- CreateTable
CREATE TABLE "onboarding_invitation_resend_attempts" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_invitation_resend_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_invitation_resend_attempts_invitationId_attemptedAt_idx" ON "onboarding_invitation_resend_attempts"("invitationId", "attemptedAt");

-- AddForeignKey
ALTER TABLE "onboarding_invitation_resend_attempts" ADD CONSTRAINT "onboarding_invitation_resend_attempts_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "onboarding_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
