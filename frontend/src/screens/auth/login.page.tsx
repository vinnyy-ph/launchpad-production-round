"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ManageJiaLogo } from "@/shared/components/brand/manage-jia-logo";
import { GoogleSignInButton } from "@/modules/auth/components/google-sign-in-button";
import { signInWithGoogle } from "@/modules/auth/services/auth.service";
import { getSignInErrorMessage } from "@/modules/auth/services/auth-errors";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { clearAuthError } from "@/modules/auth/stores/auth.store";
import {
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
      <p className="text-[12px] font-bold uppercase tracking-[2px] text-white/90">
        One workspace for your people <span aria-hidden="true">✦</span>
      </p>
      <h2
        className={
          full
            ? "mt-6 text-[clamp(40px,4.4vw,66px)] font-bold leading-[0.98] tracking-[-0.03em] text-white"
            : "mt-3 text-[32px] font-bold leading-[1.0] tracking-[-0.02em] text-white"
        }
      >
        Your team,
        <br />
        start to
        <br />
        finish.
      </h2>
      {full && (
        <p className="mt-5 max-w-[380px] text-[15px] font-medium leading-relaxed text-white/90">
          Onboarding, performance, and offboarding — one place for the whole
          employee journey.
        </p>
      )}
    </div>
  );

  if (!full) return intro;

  return (
    <div className="flex h-full w-full flex-col justify-between">
      {intro}
      {/* Tilted preview card — a real Manage Jia artifact, not a stock image. */}
      <div className="mt-12 w-[300px] max-w-full self-end rotate-3 rounded-3xl bg-white p-7 text-[color:var(--text-primary)] shadow-2xl">
        <p className="text-[26px] font-bold leading-[1.05] tracking-[-0.02em]">
          Q2 performance
          <br />
          review
        </p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[2px] text-[color:var(--text-tertiary)]">
          Maria Santos · RN <span aria-hidden="true">✦</span>
        </p>
        <div className="my-5 h-px bg-[color:var(--border-primary)]" />
        <div className="flex flex-col gap-2.5">
          {[100, 72, 100, 56, 88, 64].map((w, i) => (
            <div key={i} className="h-1.5 rounded-full bg-gray-200" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
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
          <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
            {content.intro}
          </p>
          {content.sections.map((s) => (
            <section key={s.h}>
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{s.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">
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
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const { authError } = useAuth();
  const loading = status === "loading";

  useEffect(() => {
    if (authError) {
      setStatus("idle");
      toast.error(authError, { id: "login-error" });
    }
  }, [authError]);

  async function handleSignIn() {
    clearAuthError();
    toast.dismiss("login-error");
    setStatus("loading");
    try {
      await signInWithGoogle();
      // success: useAuth observes the user; the /login guard redirects to "/".
    } catch (err) {
      setStatus("idle");
      toast.error(getSignInErrorMessage(err), { id: "login-error" });
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
        <div className="flex w-full max-w-[400px] flex-col">
          <ManageJiaLogo />
          <h1 className="mt-12 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-[38px]">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[color:var(--text-secondary)]">
            Sign in to continue to your workspace.
          </p>

          <GoogleSignInButton className="mt-8" onClick={handleSignIn} loading={loading} />

          <p className="mt-8 text-[13px] leading-relaxed text-[color:var(--text-tertiary)]">
            By continuing you agree to Manage Jia&apos;s{" "}
            <button
              type="button"
              onClick={() => setLegal("terms")}
              className="rounded-sm font-medium text-[color:var(--text-secondary)] underline underline-offset-2 outline-none transition-colors hover:text-[color:var(--text-primary)] focus-visible:ring-2 focus-visible:ring-ring"
            >
              Terms
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => setLegal("privacy")}
              className="rounded-sm font-medium text-[color:var(--text-secondary)] underline underline-offset-2 outline-none transition-colors hover:text-[color:var(--text-primary)] focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {/* Desktop poster (hidden on mobile) — dominant gradient canvas */}
      <div className="sw-poster hidden p-14 md:flex md:order-last">
        <Poster variant="full" />
      </div>

      <LegalDialog doc={legal} onOpenChange={(open) => !open && setLegal(null)} />
    </main>
  );
}
