"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { CategorySpend } from "@/lib/queries";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function colorFor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Donut of the top categories (rest collapsed into "Other") with the total
 * rendered in the center.
 */
export function CategoryDonut({
  rows,
  total,
  currency = "USD",
  label,
}: {
  rows: CategorySpend[];
  total: number;
  currency?: string;
  label: string;
}) {
  const top = rows.slice(0, 5);
  const restTotal = rows.slice(5).reduce((s, r) => s + r.amount, 0);
  const slices = restTotal > 0 ? [...top, { category: "Other", amount: restTotal, share: restTotal / total }] : top;

  if (slices.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Nothing to show for this period.
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={colorFor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
