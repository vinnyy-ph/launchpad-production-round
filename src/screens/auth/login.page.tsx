import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { SwiftWorkLogo } from "@/shared/components/brand/swift-work-logo";
import { GoogleSignInButton } from "@/modules/auth/components/google-sign-in-button";
import { signInWithGoogle, signInAsNewHire } from "@/modules/auth/services/auth.service";
import { mapSignInError } from "@/modules/auth/services/auth-errors";
import "./login.css";

/** The poster thesis — the one gradient moment, carrying the product's spine. */
function PosterThesis({ size }: { size: "band" | "full" }) {
  return (
    <div className="max-w-[440px]">
      <p
        className="jia-eyebrow"
        style={{ color: "rgba(255,255,255,0.82)" }}
      >
        Onboarding · Performance · Offboarding
      </p>
      <h2
        className={
          size === "full"
            ? "sw-thesis mt-4 text-[44px] leading-[1.04] lg:text-[60px]"
            : "sw-thesis mt-2 text-[28px] leading-[1.08]"
        }
      >
        Your people, in motion.{" "}
        <span aria-hidden="true" className="sw-thesis__mark">✦</span>
      </h2>
    </div>
  );
}

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

  async function handleNewHire() {
    setStatus("loading");
    try {
      await signInAsNewHire();
      // success: the /login guard redirects a new hire into the onboarding wizard.
    } catch (err) {
      setStatus(mapSignInError(err));
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-[minmax(360px,40%)_1fr]">
      {/* Mobile gradient band (hidden on desktop) */}
      <div className="sw-poster flex min-h-[220px] items-end p-6 md:hidden">
        <PosterThesis size="band" />
      </div>

      {/* Form rail */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:p-16">
        <div className="flex w-full max-w-[380px] flex-col">
          <SwiftWorkLogo />
          <h1 className="mt-10 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[color:var(--text-secondary)]">
            Sign in to continue to your workspace.
          </p>

          {status === "error" && (
            <div className="sw-alert mt-8" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>SwiftWork couldn't sign you in. Try again.</span>
            </div>
          )}

          <GoogleSignInButton className="mt-8" onClick={handleSignIn} loading={loading} />

          {/* Cold-start demo entry — start as a brand-new hire, straight into the wizard. */}
          <div className="mt-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[color:var(--border-primary)]" />
            <span className="text-[12px] font-medium text-[color:var(--text-quaternary)]">or try the demo</span>
            <span className="h-px flex-1 bg-[color:var(--border-primary)]" />
          </div>
          <button
            type="button"
            onClick={handleNewHire}
            disabled={loading}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-secondary)] bg-white text-[14px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)] disabled:opacity-60"
          >
            Start as a new hire
          </button>

          <p className="mt-6 text-[13px] leading-relaxed text-[color:var(--text-tertiary)]">
            By continuing you agree to SwiftWork's{" "}
            <a href="#" className="text-[color:var(--text-secondary)] underline underline-offset-2">Terms</a> and{" "}
            <a href="#" className="text-[color:var(--text-secondary)] underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Desktop poster (hidden on mobile) — dominant gradient canvas */}
      <div className="sw-poster hidden items-end p-14 md:flex md:order-last">
        <PosterThesis size="full" />
      </div>
    </main>
  );
}
