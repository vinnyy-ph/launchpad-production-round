import { cn } from "@/shared/lib/utils";

type Tone = "dark" | "light";

interface ManageJiaLogoProps {
  /** dark = ink wordmark (on light surfaces); light = white wordmark (on dark/gradient). */
  tone?: Tone;
  /** Mark height in px. The wordmark scales with it. */
  size?: number;
  className?: string;
  /** Render just the gradient mark (no wordmark). */
  markOnly?: boolean;
}

/**
 * Manage Jia brand lockup — the Jia design-system gradient mark plus a live
 * "Manage Jia" wordmark (Satoshi). The wordmark is rendered as text rather than
 * baked into the logo image, so the product always reads "Manage Jia" (the old
 * jia-logo.svg lockup rendered just "Jia"). Assets live in /public/brand.
 */
export function ManageJiaLogo({ tone = "dark", size = 38, className, markOnly = false }: ManageJiaLogoProps) {
  if (markOnly) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/jia-logomark.svg"
        alt="Manage Jia"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="Manage Jia">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/jia-logomark.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
      <span
        style={{
          fontSize: Math.round(size * 0.52),
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: tone === "light" ? "#ffffff" : "var(--text-primary)",
        }}
      >
        Manage Jia
      </span>
    </span>
  );
}
