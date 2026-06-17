// frontend/src/app/router.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { RequireAuth } from "@/modules/auth/components/require-auth";
import { RequireRole } from "@/modules/auth/components/require-role";
import { roleHome } from "@/modules/auth/role-home";
import { AppShell } from "@/shared/components/layout/app-shell";
import LoginPage from "@/pages/auth/login.page";
import HomePage from "@/pages/home.page";
import UsersPage from "@/pages/admin/users.page";
import DirectoryPage from "@/pages/hr/directory.page";
import OnboardingPage from "@/pages/hr/onboarding.page";
import OnboardingDetailPage from "@/pages/hr/onboarding-detail.page";
import OffboardingPage from "@/pages/hr/offboarding.page";
import OffboardingDetailPage from "@/pages/hr/offboarding-detail.page";
import HRSurveysPage from "@/pages/hr/surveys.page";
import EvaluationsPage from "@/pages/supervisor/evaluations.page";
import ReportsPage from "@/pages/supervisor/reports.page";
import ProfilePage from "@/pages/employee/profile.page";
import EmployeeOnboardingPage from "@/pages/employee/onboarding.page";
import ClearancePage from "@/pages/employee/clearance.page";
import EmployeeSurveysPage from "@/pages/employee/surveys.page";
import PerformanceHubPage from "@/pages/performance.page";
import OffboardingHubPage from "@/pages/offboarding.page";
import TeamsPage from "@/pages/hr/teams.page";
import EmployeeProfilePage from "@/pages/hr/employee-profile.page";

export function AppRouter() {
  const { appUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return (
    <Routes>
      {/* Unauthenticated — once signed in, land directly on the role's home */}
      <Route
        path="/login"
        element={appUser ? <Navigate to={roleHome(appUser)} replace /> : <LoginPage />}
      />

      {/* Authenticated — all nested routes render inside AppShell via <Outlet /> */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />

        <Route path="/performance" element={<PerformanceHubPage />} />
        <Route path="/offboarding" element={<OffboardingHubPage />} />
        <Route
          path="/hr/teams"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><TeamsPage /></RequireRole>}
        />

        <Route
          path="/admin/users"
          element={<RequireRole allowedRoles={["ADMIN"]}><UsersPage /></RequireRole>}
        />

        <Route
          path="/hr/directory"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><DirectoryPage /></RequireRole>}
        />
        <Route
          path="/hr/directory/:id"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><EmployeeProfilePage /></RequireRole>}
        />
        <Route
          path="/hr/onboarding"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><OnboardingPage /></RequireRole>}
        />
        <Route
          path="/hr/onboarding/:id"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><OnboardingDetailPage /></RequireRole>}
        />
        <Route
          path="/hr/offboarding"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><OffboardingPage /></RequireRole>}
        />
        <Route
          path="/hr/offboarding/:id"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><OffboardingDetailPage /></RequireRole>}
        />
        <Route
          path="/hr/surveys"
          element={<RequireRole allowedRoles={["HR", "ADMIN"]}><HRSurveysPage /></RequireRole>}
        />

        <Route
          path="/supervisor/evaluations"
          element={<RequireRole allowedRoles={["SUPERVISOR", "ADMIN"]}><EvaluationsPage /></RequireRole>}
        />
        <Route
          path="/supervisor/reports"
          element={<RequireRole allowedRoles={["SUPERVISOR", "ADMIN"]}><ReportsPage /></RequireRole>}
        />

        <Route path="/employee/profile" element={<ProfilePage />} />
        <Route path="/employee/onboarding" element={<EmployeeOnboardingPage />} />
        <Route path="/employee/clearance" element={<ClearancePage />} />
        <Route path="/employee/surveys" element={<EmployeeSurveysPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
