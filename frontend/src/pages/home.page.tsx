import { useAuth } from "@/modules/auth/hooks/use-auth";
import { signOutUser } from "@/modules/auth/services/auth.service";

/** Minimal post-login landing — placeholder until the app shell exists. */
export default function HomePage() {
  const { user } = useAuth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-[color:var(--text-secondary)]">
        Signed in as <span className="font-medium text-[color:var(--text-primary)]">{user?.email}</span>
      </p>
      <button
        onClick={() => void signOutUser()}
        className="h-11 rounded-lg border border-[color:var(--border-secondary)] bg-white px-4 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--bg-secondary)]"
      >
        Sign out
      </button>
    </main>
  );
}
