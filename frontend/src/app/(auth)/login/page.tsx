"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { roleHome } from "@/modules/auth/role-home";
import { DiamondLoader } from "@/shared/ui/patterns";
import LoginPage from "@/screens/auth/login.page";

export default function Login() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && appUser) router.replace(roleHome(appUser));
  }, [loading, appUser, router]);

  // While auth resolves (or we're about to redirect a signed-in user),
  // show a centered spinner instead of flashing the form.
  if (loading || appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <DiamondLoader size={44} />
      </div>
    );
  }
  return <LoginPage />;
}
