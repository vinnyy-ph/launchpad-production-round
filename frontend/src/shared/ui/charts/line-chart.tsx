"use client";

import { BarChart2 } from "lucide-react";
import { CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./palette";

export interface LineChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  height?: number;
  /** Anonymity guard: hide the chart until the summed n reaches this minimum. */
  minGroupSize?: number;
}

export function LineChart({ data, categoryKey, valueKey, height = 240, minGroupSize }: LineChartProps) {
  if (minGroupSize != null) {
    const total = data.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);
    if (total < minGroupSize) {
      return (
        <EmptyState
          icon={BarChart2}
          title="Not enough data"
          body="Results are hidden until the minimum group size is reached."
        />
      );
    }
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Line type="monotone" dataKey={valueKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
      </RLineChart>
    </ResponsiveContainer>
  );
}
