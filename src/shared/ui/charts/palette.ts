import type * as React from "react";

// Resolves to the --chart-* CSS vars defined in src/index.css (Jia palette).
// Brand pastels lead so single-series charts render in-brand (never near-black);
// the grays are kept only as a multi-series fallback.
export const CHART_COLORS = [
  "hsl(var(--chart-4))", // #FCCEC0 peach — primary single series
  "hsl(var(--chart-6))", // #9FCAED sky
  "hsl(var(--chart-5))", // #EBACC9 pink
  "hsl(var(--chart-2))", // #4A5578 gray-mid (multi-series fallback)
  "hsl(var(--chart-3))", // #B9C0D4 gray-light
  "hsl(var(--chart-1))", // #111322 near-black (last resort)
];

// Branded recharts <Tooltip contentStyle> — inherits the Satoshi body font,
// soft border + shadow, matching the kit card surface.
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--border-primary)",
  boxShadow: "var(--shadow-sm)",
};
