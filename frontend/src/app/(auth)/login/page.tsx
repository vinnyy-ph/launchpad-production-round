"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { roleHome } from "@/modules/auth/role-home";
import LoginPage from "@/pages/auth/login.page";

export default function Login() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && appUser) router.replace(roleHome(appUser));
  }, [loading, appUser, router]);

  if (!loading && appUser) return null;
  return <LoginPage />;
}
