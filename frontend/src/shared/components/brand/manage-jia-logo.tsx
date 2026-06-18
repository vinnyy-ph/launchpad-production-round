type Tone = "dark" | "light";

interface ManageJiaLogoProps {
  /** dark = dark tile/white bars (on white surfaces); light = inverted (on gradient/dark). */
  tone?: Tone;
  /** Mark size in px (square). Wordmark scales relative to this. */
  size?: number;
  className?: string;
  markOnly?: boolean;
}

/**
 * Manage Jia brand lockup: rising-bars mark + "Manage Jia" wordmark + ✦.
 * Monochrome by design — the brand gradient is reserved for the login poster.
 */
export function ManageJiaLogo({ tone = "dark", size = 38, className, markOnly = false }: ManageJiaLogoProps) {
  const tile = tone === "dark" ? "#181D27" : "#FFFFFF";
  const bars = tone === "dark" ? "#FFFFFF" : "#181D27";
  const text = tone === "dark" ? "#181D27" : "#FFFFFF";

  if (markOnly) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
        <rect width="40" height="40" rx="9" fill={tile} />
        <g fill={bars}>
          <rect x="12" y="22" width="4.2" height="8" rx="2.1" />
          <rect x="17.9" y="16.5" width="4.2" height="13.5" rx="2.1" />
          <rect x="23.8" y="11" width="4.2" height="19" rx="2.1" />
        </g>
      </svg>
    );
  }

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="9" fill={tile} />
        <g fill={bars}>
          <rect x="12" y="22" width="4.2" height="8" rx="2.1" />
          <rect x="17.9" y="16.5" width="4.2" height="13.5" rx="2.1" />
          <rect x="23.8" y="11" width="4.2" height="19" rx="2.1" />
        </g>
      </svg>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: Math.round(size * 0.56),
          letterSpacing: "-0.02em",
          color: text,
          lineHeight: 1,
        }}
      >
        Manage Jia
      </span>
      <span
        aria-hidden="true"
        style={{ color: text, fontSize: Math.round(size * 0.32), alignSelf: "flex-start", marginTop: Math.round(size * 0.08) }}
      >
        {"✦"}
      </span>
    </div>
  );
}
