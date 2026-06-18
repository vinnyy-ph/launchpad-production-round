type Tone = "dark" | "light";

interface ManageJiaLogoProps {
  /** dark = ink wordmark (on light surfaces); light = white wordmark (on dark/gradient). */
  tone?: Tone;
  /** Logo height in px. The full lockup keeps its 2:1 aspect; the mark is square. */
  size?: number;
  className?: string;
  /** Render just the gradient mark (no wordmark). */
  markOnly?: boolean;
}

/**
 * Manage Jia brand lockup — uses the Jia design-system logo assets
 * (Manage Jia rides on the Jia brand mark). Assets live in /public/brand.
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

  const src = tone === "light" ? "/brand/jia-logo-on-dark.svg" : "/brand/jia-logo.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Manage Jia"
      height={size}
      className={className}
      style={{ height: size, width: "auto" }}
    />
  );
}
