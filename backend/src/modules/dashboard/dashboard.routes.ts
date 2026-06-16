import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.middleware";
import { resolveSession } from "../auth/auth.service";
import { prisma } from "../../core/database/prisma.service";

export const dashboardRoutes = Router();

// GET /api/dashboard — role-aware "at a glance" counts for the home screen.
// Right-sized: returns the reliable employee-status counts; richer per-domain
// metrics (clearances, evaluations, surveys) belong to the owning modules and
// are omitted here (the UI renders "—" for absent fields).
dashboardRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const session = await resolveSession(req.user!);

    if (session.role === "ADMIN" || session.role === "HR") {
      const [activeEmployees, pendingOnboarding, pendingOffboarding] = await Promise.all([
        prisma.employee.count({ where: { status: "ACTIVE" } }),
        prisma.employee.count({ where: { status: "ONBOARDING" } }),
        prisma.employee.count({ where: { status: "OFFBOARDING" } }),
      ]);
      return res.json({ activeEmployees, pendingOnboarding, pendingOffboarding });
    }

    if (session.isSupervisor && session.employeeId) {
      const directReports = await prisma.employee.count({
        where: { supervisorId: session.employeeId },
      });
      return res.json({ directReports });
    }

    // EMPLOYEE — no cheap, reliable stats to surface yet.
    return res.json({});
  } catch (err) {
    return next(err);
  }
});
