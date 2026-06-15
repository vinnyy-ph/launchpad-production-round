import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { RequireAuth } from "@/modules/auth/components/require-auth";
import LoginPage from "@/pages/auth/login.page";
import HomePage from "@/pages/home.page";

export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
