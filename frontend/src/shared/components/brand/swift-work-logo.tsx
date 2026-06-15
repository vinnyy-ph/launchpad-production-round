interface SwiftWorkLogoProps {
  /** "light" = white icon + white text, for use on dark backgrounds.
   *  "dark"  = dark icon + dark text, for use on light backgrounds. */
  tone?: "dark" | "light";
  size?: number;
}

export function SwiftWorkLogo({ tone = "dark", size = 28 }: SwiftWorkLogoProps) {
  const isLight = tone === "light";
  // Icon: white square with dark bars (light) OR dark square with white bars (dark)
  const iconBg = isLight ? "#ffffff" : "#0a0a0a";
  const iconBars = isLight ? "#0a0a0a" : "#ffffff";
  // Label text color
  const labelColor = isLight ? "#ffffff" : "#0a0a0a";

  return (
    <div className="flex items-center gap-2" style={{ height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        fill="none"
      >
        <rect width="40" height="40" rx="8" fill={iconBg} />
        <g fill={iconBars}>
          <rect x="12" y="22" width="4.2" height="8" rx="2.1" />
          <rect x="17.9" y="16.5" width="4.2" height="13.5" rx="2.1" />
          <rect x="23.8" y="11" width="4.2" height="19" rx="2.1" />
        </g>
      </svg>
      <span
        className="font-semibold tracking-tight whitespace-nowrap"
        style={{ color: labelColor, fontSize: size * 0.6, lineHeight: 1 }}
      >
        SwiftWork
      </span>
    </div>
  );
}
