import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.middleware";
import { resolveSession } from "../auth/auth.service";
import { prisma } from "../../core/database/prisma.service";

export const dashboardRoutes = Router();

/** Open pulse occurrences this employee is in the audience for and hasn't answered yet. */
function countOpenSurveys(employeeId: string) {
  const now = new Date();
  return prisma.surveyOccurrence.count({
    where: {
      isClosed: false,
      releaseDate: { lte: now },
      deadline: { gt: now },
      survey: { isActive: true, deletedAt: null },
      audienceMembers: { some: { employeeId } },
      // "Answered" is tracked by SurveyCompletion, not SurveyResponse: anonymous
      // responses store employeeId = null, so a `responses.none` check would never
      // match an anonymous submission and would keep counting it as pending. This
      // mirrors the surveys-list query (me.repository.findPendingSurveys).
      completions: { none: { employeeId } },
    },
  });
}

// GET /api/dashboard — additive "at a glance" counts for the home screen. Returns
// every lane the caller holds (Employee → Supervisor → HR/Admin), merged into one
// object, so the sectioned dashboard can show all of a user's hats at once. Every
// authenticated user holds the Employee lane (the subclass rule), so a supervisor or
// HR user gets their own pulses/acknowledgements alongside their team/org counts.
dashboardRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const session = await resolveSession(req.user!);
    const stats: Record<string, unknown> = {};
    const me = session.employeeId;

    // Employee lane — the caller's own to-dos: pulses to answer, evaluations to
    // acknowledge, plus onboarding figures (meaningful while ONBOARDING).
    if (me) {
      const [pendingDocuments, totalDocuments, approvedDocuments, unreadSurveys, pendingAcknowledgements, meRecord] =
        await Promise.all([
          prisma.onboardingDocumentSubmission.count({ where: { status: "PENDING", record: { employeeId: me } } }),
          prisma.onboardingDocumentSubmission.count({ where: { record: { employeeId: me } } }),
          prisma.onboardingDocumentSubmission.count({ where: { status: "APPROVED", record: { employeeId: me } } }),
          countOpenSurveys(me),
          // Evaluations issued to me that I haven't acknowledged and weren't deemed-acked.
          prisma.performanceEvaluation.count({
            where: {
              revieweeId: me,
              isSent: true,
              deletedAt: null,
              NOT: { acknowledgement: { OR: [{ acknowledgedAt: { not: null } }, { isDeemedAck: true }] } },
            },
          }),
          // The caller's own supervisor (org-graph reportsTo). Name + title only — both public,
          // not part of the redacted profile set — so safe to surface on the dashboard.
          prisma.employee.findUnique({
            where: { id: me },
            select: {
              supervisor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  jobTitle: true,
                  user: { select: { avatarUrl: true } },
                },
              },
            },
          }),
        ]);
      stats.pendingDocuments = pendingDocuments;
      stats.onboardingProgress = totalDocuments > 0 ? Math.round((approvedDocuments / totalDocuments) * 100) : 0;
      stats.unreadSurveys = unreadSurveys;
      stats.pendingAcknowledgements = pendingAcknowledgements;
      const sup = meRecord?.supervisor;
      stats.supervisor = sup
        ? {
            id: sup.id,
            fullName: `${sup.firstName} ${sup.lastName}`,
            jobTitle: sup.jobTitle,
            avatarUrl: sup.user?.avatarUrl ?? null,
          }
        : null;
    }

    // Supervisor lane — the team they manage. (Surveys live in the employee lane above.)
    if (session.isSupervisor && me) {
      const [directReports, pendingEvaluations, totalEvaluations, completedEvaluations] = await Promise.all([
        prisma.employee.count({ where: { supervisorId: me } }),
        prisma.performanceEvaluation.count({ where: { reviewerId: me, isSent: false, deletedAt: null } }),
        prisma.performanceEvaluation.count({ where: { reviewerId: me, isSent: true, deletedAt: null } }),
        prisma.performanceEvaluation.count({
          where: {
            reviewerId: me,
            isSent: true,
            deletedAt: null,
            acknowledgement: { OR: [{ acknowledgedAt: { not: null } }, { isDeemedAck: true }] },
          },
        }),
      ]);
      stats.directReports = directReports;
      stats.pendingEvaluations = pendingEvaluations;
      stats.totalEvaluations = totalEvaluations;
      stats.completedEvaluations = completedEvaluations;
    }

    // HR / Admin lane — org-wide lifecycle counts.
    if (session.role === "ADMIN" || session.role === "HR") {
      const [activeEmployees, pendingOnboarding, pendingOffboarding, pendingClearances] = await Promise.all([
        prisma.employee.count({ where: { status: "ACTIVE" } }),
        prisma.employee.count({ where: { status: "ONBOARDING" } }),
        prisma.employee.count({ where: { status: "OFFBOARDING" } }),
        // Org-wide clearance sign-offs still awaiting a signatory.
        prisma.clearanceSignatureRequest.count({ where: { status: "PENDING" } }),
      ]);
      stats.activeEmployees = activeEmployees;
      stats.pendingOnboarding = pendingOnboarding;
      stats.pendingOffboarding = pendingOffboarding;
      stats.pendingClearances = pendingClearances;
    }

    return res.json(stats);
  } catch (err) {
    return next(err);
  }
});
