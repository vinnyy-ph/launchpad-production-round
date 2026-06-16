import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { SwiftWorkLogo } from "@/shared/components/brand/swift-work-logo";
import { GoogleSignInButton } from "@/modules/auth/components/google-sign-in-button";
import { signInWithGoogle } from "@/modules/auth/services/auth.service";
import { mapSignInError } from "@/modules/auth/services/auth-errors";
import "./login.css";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const loading = status === "loading";

  async function handleSignIn() {
    setStatus("loading");
    try {
      await signInWithGoogle();
      // success: useAuth observes the user; the /login guard redirects to "/".
    } catch (err) {
      setStatus(mapSignInError(err));
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      {/* Mobile gradient band (hidden on desktop) */}
      <div className="sw-poster flex h-[150px] items-end p-6 md:hidden">
        <p className="max-w-[230px] text-lg font-bold leading-tight tracking-[-0.02em] text-white">
          Where your people and performance live in one place.
        </p>
      </div>

      {/* Form pane */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:p-16">
        <div className="flex w-full max-w-[380px] flex-col">
          <SwiftWorkLogo />
          <h1 className="mt-10 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[color:var(--text-secondary)]">
            Sign in to continue to your workspace.
          </p>

          {status === "error" && (
            <div className="sw-alert mt-8" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>Swift Work couldn't sign you in. Try again.</span>
            </div>
          )}

          <GoogleSignInButton className="mt-8" onClick={handleSignIn} loading={loading} />

          <p className="mt-6 text-[13px] leading-relaxed text-[color:var(--text-tertiary)]">
            By continuing you agree to Swift Work's{" "}
            <a href="#" className="text-[color:var(--text-secondary)] underline underline-offset-2">Terms</a> and{" "}
            <a href="#" className="text-[color:var(--text-secondary)] underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Desktop poster (hidden on mobile) */}
      <div className="sw-poster hidden items-end p-14 md:flex md:order-last">
        <p className="max-w-[380px] text-3xl font-bold leading-snug tracking-[-0.02em] text-white">
          Where your people and performance live in one place.
        </p>
      </div>
    </main>
  );
}
