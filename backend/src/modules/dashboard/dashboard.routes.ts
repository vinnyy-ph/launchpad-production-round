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
      responses: { none: { employeeId } },
    },
  });
}

// GET /api/dashboard — role-aware "at a glance" counts for the home screen.
// Right-sized: returns the reliable employee-status counts; richer per-domain
// metrics (clearances, evaluations, surveys) belong to the owning modules and
// are omitted here (the UI renders "—" for absent fields).
dashboardRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const session = await resolveSession(req.user!);

    if (session.role === "ADMIN" || session.role === "HR") {
      const [activeEmployees, pendingOnboarding, pendingOffboarding, pendingClearances] =
        await Promise.all([
          prisma.employee.count({ where: { status: "ACTIVE" } }),
          prisma.employee.count({ where: { status: "ONBOARDING" } }),
          prisma.employee.count({ where: { status: "OFFBOARDING" } }),
          // Org-wide clearance sign-offs still awaiting a signatory.
          prisma.clearanceSignatureRequest.count({ where: { status: "PENDING" } }),
        ]);
      return res.json({ activeEmployees, pendingOnboarding, pendingOffboarding, pendingClearances });
    }

    if (session.isSupervisor && session.employeeId) {
      const me = session.employeeId;
      const [directReports, pendingEvaluations, totalEvaluations, completedEvaluations, unreadSurveys] =
        await Promise.all([
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
          countOpenSurveys(me),
        ]);
      return res.json({
        directReports,
        pendingEvaluations,
        totalEvaluations,
        completedEvaluations,
        unreadSurveys,
      });
    }

    if (session.employeeId) {
      const me = session.employeeId;
      const [pendingDocuments, totalDocuments, approvedDocuments, unreadSurveys] = await Promise.all([
        prisma.onboardingDocumentSubmission.count({ where: { status: "PENDING", record: { employeeId: me } } }),
        prisma.onboardingDocumentSubmission.count({ where: { record: { employeeId: me } } }),
        prisma.onboardingDocumentSubmission.count({ where: { status: "APPROVED", record: { employeeId: me } } }),
        countOpenSurveys(me),
      ]);
      const onboardingProgress =
        totalDocuments > 0 ? Math.round((approvedDocuments / totalDocuments) * 100) : 0;
      return res.json({ pendingDocuments, onboardingProgress, unreadSurveys });
    }

    return res.json({});
  } catch (err) {
    return next(err);
  }
});
