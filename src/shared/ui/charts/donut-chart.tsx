"use client";

import { BarChart2 } from "lucide-react";
import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./palette";

export interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
  /** Anonymity guard: hide the chart until the summed n reaches this minimum. */
  minGroupSize?: number;
}

export function DonutChart({ data, height = 240, minGroupSize }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (minGroupSize != null && total < minGroupSize) {
    return (
      <EmptyState
        icon={BarChart2}
        title="Not enough data"
        body="Results are hidden until the minimum group size is reached."
      />
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          <Label
            position="center"
            value={total}
            style={{ fill: "var(--text-primary)", fontSize: 20, fontWeight: 700 }}
          />
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
