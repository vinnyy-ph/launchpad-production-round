import type * as React from "react";

// Resolves to the --chart-* CSS vars defined in src/index.css (Jia palette).
// Strict Jia: charts read monochrome. A dark near-black leads so single-series
// bars are high-contrast and readable; the cool-gray ramp differentiates
// multi-series. The brand pastels sit last — accent only, never the default fill
// (the one gradient moment per view is spent elsewhere, not smeared across data).
export const CHART_COLORS = [
  "hsl(var(--chart-1))", // #111322 near-black — primary single series
  "hsl(var(--chart-2))", // #4A5578 gray-mid
  "hsl(var(--chart-3))", // #B9C0D4 gray-light
  "hsl(var(--chart-6))", // #9FCAED sky — accent
  "hsl(var(--chart-5))", // #EBACC9 pink — accent
  "hsl(var(--chart-4))", // #FCCEC0 peach — accent
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
