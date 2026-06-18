"use client";

import { useState } from "react";
import { AlertCircle, UserPlus, LineChart, DoorOpen, ShieldCheck } from "lucide-react";
import { ManageJiaLogo } from "@/shared/components/brand/manage-jia-logo";
import { GoogleSignInButton } from "@/modules/auth/components/google-sign-in-button";
import { signInWithGoogle } from "@/modules/auth/services/auth.service";
import { mapSignInError } from "@/modules/auth/services/auth-errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui";
import "./login.css";

// ─── Poster ────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: UserPlus,
    title: "Onboarding that runs itself",
    body: "Invitations, documents, and first-day clearances tracked end to end.",
  },
  {
    icon: LineChart,
    title: "Performance worth reading",
    body: "Pulse surveys and evaluations that turn into action, not noise.",
  },
  {
    icon: DoorOpen,
    title: "Clean exits, every time",
    body: "Clearances, sign-offs, and access closed out without the scramble.",
  },
] as const;

/** The poster — the one gradient moment, carrying the product's spine. */
function Poster({ variant }: { variant: "band" | "full" }) {
  const full = variant === "full";

  const lede = (
    <div className="max-w-[460px]">
      <p className="jia-eyebrow text-white/80">People operations, end to end</p>
      <h2
        className={
          full
            ? "sw-thesis mt-4 text-[40px] leading-[1.05] lg:text-[52px]"
            : "sw-thesis mt-2 text-[26px] leading-[1.1]"
        }
      >
        Every hire, review, and goodbye — handled with care.{" "}
        <span aria-hidden="true" className="sw-thesis__mark">✦</span>
      </h2>

      {full && (
        <>
          <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-white/85">
            Manage Jia keeps onboarding, performance, and offboarding in one calm
            workspace — less paperwork, more people.
          </p>
          <ul className="mt-9 space-y-5">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/25">
                  <Icon size={18} className="text-white" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-white/75">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  if (!full) return lede;

  return (
    <div className="flex h-full w-full flex-col justify-between">
      {lede}
      <p className="mt-10 text-[13px] text-white/65">
        © 2026 Manage Jia · People &amp; performance, in one place.
      </p>
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
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [legal, setLegal] = useState<LegalDoc | null>(null);
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
    <main className="min-h-screen md:grid md:grid-cols-[minmax(360px,40%)_1fr]">
      {/* Mobile gradient band (hidden on desktop) */}
      <div className="sw-poster flex min-h-[200px] items-end p-6 md:hidden">
        <Poster variant="band" />
      </div>

      {/* Form rail */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:p-16">
        <div className="flex w-full max-w-[380px] flex-col">
          <ManageJiaLogo />
          <h1 className="mt-10 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[color:var(--text-secondary)]">
            Sign in with your work Google account to pick up where your team left off.
          </p>

          {status === "error" && (
            <div className="sw-alert mt-8" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>Manage Jia couldn't sign you in. Try again.</span>
            </div>
          )}

          <GoogleSignInButton className="mt-8" onClick={handleSignIn} loading={loading} />

          <p className="mt-4 flex items-center gap-1.5 text-[13px] text-[color:var(--text-tertiary)]">
            <ShieldCheck size={14} className="flex-none" aria-hidden="true" />
            Use the Google account your workspace invited you with.
          </p>

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
