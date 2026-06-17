"use client";

import { Bar, BarChart as RBarChart, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "./palette";

export interface SparkBarProps {
  data: number[];
  height?: number;
}

export function SparkBar({ data, height = 40 }: SparkBarProps) {
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={rows}>
        <Bar dataKey="v" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
      </RBarChart>
    </ResponsiveContainer>
  );
}
