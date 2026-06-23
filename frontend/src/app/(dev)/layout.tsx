import { notFound } from "next/navigation";

/** Dev-only route group (UI kit showcase). Returns 404 in production builds. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <>{children}</>;
}
