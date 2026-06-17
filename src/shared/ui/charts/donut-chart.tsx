"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "./palette";

export interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function DonutChart({ data, height = 240 }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
