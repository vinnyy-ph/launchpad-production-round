import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <FileQuestion className="h-10 w-10 text-[color:var(--text-quaternary)]" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-[color:var(--text-primary)]">Page not found</h1>
        <p className="text-sm text-[color:var(--text-tertiary)]">
          This page does not exist or may have moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
