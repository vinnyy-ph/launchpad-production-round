"use client";

import { CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "./palette";

export interface LineChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  height?: number;
}

export function LineChart({ data, categoryKey, valueKey, height = 240 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <Tooltip />
        <Line type="monotone" dataKey={valueKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
      </RLineChart>
    </ResponsiveContainer>
  );
}
