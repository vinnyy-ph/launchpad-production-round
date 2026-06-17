"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "./palette";

export interface BarChartProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  height?: number;
}

export function BarChart({ data, categoryKey, valueKey, height = 240 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey={valueKey} fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
      </RBarChart>
    </ResponsiveContainer>
  );
}
