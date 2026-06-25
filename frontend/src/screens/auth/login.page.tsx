"use client";

import { useEffect, useState } from "react";
import { ManageJiaLogo } from "@/shared/components/brand/manage-jia-logo";
import { GoogleSignInButton } from "@/modules/auth/components/google-sign-in-button";
import { signInWithGoogle } from "@/modules/auth/services/auth.service";
import { getSignInErrorMessage, isBenignSignInCancel } from "@/modules/auth/services/auth-errors";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { clearAuthError, useAuthStore } from "@/modules/auth/stores/auth.store";
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui";
import "./login.css";

// ─── Poster ────────────────────────────────────────────────────────────────────

/** The poster — the one gradient moment: a big display line over a tilted
 *  preview card of a real Manage Jia artifact. */
function Poster({ variant }: { variant: "band" | "full" }) {
  const full = variant === "full";

  const intro = (
    <div>
      <h2
        className={
          full
            ? "text-[clamp(28px,2.8vw,34px)] font-bold leading-[1.1] tracking-[-0.02em] text-white"
            : "text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-white"
        }
      >
        Where your people
        <br />
        do their best work.
      </h2>
      {full && (
        <p className="mt-5 max-w-[380px] text-[14px] font-medium leading-[20px] text-white/90">
          An intelligent workspace with the insights, tools, and data your
          organization needs to move better, together.
        </p>
      )}
    </div>
  );

  if (!full) return intro;

  return (
    <div className="flex h-full w-full flex-col justify-center">
      {intro}
    </div>
  );
}

// ─── Legal modal ─────────────────────────────────────────────────────────────

type LegalDoc = "terms" | "privacy";

interface LegalContent {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string }[];
}

const TERMS: LegalContent = {
  title: "Terms of service",
  updated: "June 19, 2026",
  intro:
    "These terms cover how your team uses Manage Jia. By signing in, you agree to them on behalf of yourself and your organisation.",
  sections: [
    {
      h: "Using Manage Jia",
      p: "Manage Jia is a workforce platform for onboarding, performance, and offboarding. Access is granted by your organisation — you may only sign in with a work account your administrator has invited.",
    },
    {
      h: "Your account",
      p: "You're responsible for activity under your account. Sign in only with the Google account issued by your workspace, and let your administrator know right away if you suspect unauthorised access.",
    },
    {
      h: "Acceptable use",
      p: "Use Manage Jia only for legitimate people-operations work within your organisation. Don't try to reach records you aren't authorised to see, disrupt the service, or misuse employee data.",
    },
    {
      h: "Your organisation's data",
      p: "Records you create or view belong to your organisation, which controls who can access them and how long they're kept. Manage Jia processes this data on your organisation's behalf.",
    },
    {
      h: "Availability",
      p: "We work to keep Manage Jia available and accurate, but the service is provided as is for this engagement, and features may change as the product evolves.",
    },
    {
      h: "Questions",
      p: "For anything about these terms, reach out to your workspace administrator or the Manage Jia team.",
    },
  ],
};

const PRIVACY: LegalContent = {
  title: "Privacy policy",
  updated: "June 19, 2026",
  intro:
    "Manage Jia handles employee information for care teams, so we keep what we collect tight and who can see it tighter.",
  sections: [
    {
      h: "What we collect",
      p: "To run your workspace, we store the employee records your organisation provides — names, work contact details, roles, team membership — plus the onboarding, evaluation, and offboarding activity you generate.",
    },
    {
      h: "How we use it",
      p: "Your data powers only the features you see: directories, onboarding, performance reviews, pulse surveys, and clearances. We never sell it or use it for advertising.",
    },
    {
      h: "Who can see what",
      p: "Access follows your role. Sensitive personal details are redacted from anyone who shouldn't see them, and responses to a survey marked anonymous are kept anonymous.",
    },
    {
      h: "Signing in",
      p: "We use Google sign-in to verify who you are. From Google we receive your name, email, and profile photo — never your password.",
    },
    {
      h: "Keeping data safe",
      p: "Data is encrypted in transit and scoped by role. When someone is offboarded, their history is preserved for compliance rather than deleted silently.",
    },
    {
      h: "Your choices",
      p: "To access, correct, or remove your personal data, contact your workspace administrator, who manages records on your organisation's behalf.",
    },
  ],
};

function LegalDialog({
  doc,
  onOpenChange,
}: {
  doc: LegalDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const content = doc === "privacy" ? PRIVACY : TERMS;
  return (
    <Dialog open={doc !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>Last updated {content.updated}</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-1">
          <p className="text-sm leading-[20px] text-[color:var(--text-secondary)]">
            {content.intro}
          </p>
          {content.sections.map((s) => (
            <section key={s.h}>
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{s.h}</h3>
              <p className="mt-1.5 text-sm leading-[20px] text-[color:var(--text-secondary)]">
                {s.p}
              </p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [rememberMe, setRememberMe] = useState(true);
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const { authError } = useAuth();
  const loading = status === "loading";

  useEffect(() => {
    if (authError) setStatus("idle");
  }, [authError]);

  async function handleSignIn() {
    clearAuthError();
    setStatus("loading");
    try {
      await signInWithGoogle(rememberMe);
      // success: useAuth observes the user; the /login guard redirects to "/".
    } catch (err) {
      setStatus("idle");
      // Surface failures on the one inline error line; a user-cancelled popup is
      // intentional, so it stays silent.
      if (!isBenignSignInCancel(err)) {
        useAuthStore.setState({ authError: getSignInErrorMessage(err) });
      }
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      {/* Mobile gradient band (hidden on desktop) */}
      <div className="sw-poster flex min-h-[200px] items-end p-6 md:hidden">
        <Poster variant="band" />
      </div>

      {/* Form rail */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:p-16 lg:p-20">
        <div className="flex w-full max-w-[440px] flex-col items-center text-center">
          <ManageJiaLogo markOnly size={40} />
          <h1 className="mt-6 text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-[color:var(--text-primary)]">
            Welcome back
          </h1>
          <p className="mt-2 text-balance text-[14px] leading-[20px] text-[color:var(--text-secondary)]">
            Sign in to continue to your workspace.
          </p>

          {authError && (
            <p role="alert" className="mt-6 text-sm font-medium text-[color:var(--color-error-600)]">
              {authError}
            </p>
          )}

          {/* Action group — tighten when an error is shown so message and CTA stay visually linked. */}
          <GoogleSignInButton
            className={authError ? "mt-3" : "mt-10"}
            onClick={handleSignIn}
            loading={loading}
          />

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 self-start text-left">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              disabled={loading}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="mt-0.5"
            />
            <span className="text-[14px] leading-[20px] text-[color:var(--text-secondary)]">
              Remember me
            </span>
          </label>

          {/* Legal — mt-10 mirrors the heading→action gap above. */}
          <p className="mt-10 text-balance text-[12px] leading-[18px] text-[color:var(--text-tertiary)]">
            By continuing, you agree to Manage Jia&apos;s{" "}
            <button
              type="button"
              onClick={() => setLegal("terms")}
              className="rounded-sm font-medium text-[color:var(--text-primary)] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Terms
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => setLegal("privacy")}
              className="rounded-sm font-medium text-[color:var(--text-primary)] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {/* Desktop poster (hidden on mobile) — dominant gradient canvas */}
      <div className="sw-poster hidden p-10 md:flex md:order-last">
        <Poster variant="full" />
      </div>

      <LegalDialog doc={legal} onOpenChange={(open) => !open && setLegal(null)} />
    </main>
  );
}
