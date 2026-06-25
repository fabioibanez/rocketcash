"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { CashFlowMonth } from "@/lib/queries";

export function CashFlowChart({
  data,
  currency = "USD",
}: {
  data: CashFlowMonth[];
  currency?: string;
}) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
        <p>No cash flow yet.</p>
        <p>Income and spending appear here once transactions sync.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as CashFlowMonth;
            return (
              <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-md">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <div className="space-y-0.5">
                  <Row label="Income" value={row.income} currency={currency} color="var(--income)" />
                  <Row label="Spending" value={row.expenses} currency={currency} color="var(--expense)" />
                  <div className="mt-1 border-t border-border pt-1">
                    <Row
                      label="Net"
                      value={row.net}
                      currency={currency}
                      color={row.net >= 0 ? "var(--income)" : "var(--expense)"}
                      signed
                    />
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="income" fill="var(--income)" radius={[5, 5, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill="var(--expense)" radius={[5, 5, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Row({
  label,
  value,
  currency,
  color,
  signed = false,
}: {
  label: string;
  value: number;
  currency: string;
  color: string;
  signed?: boolean;
}) {
  const text = signed && value > 0 ? `+${formatCurrency(value, currency)}` : formatCurrency(value, currency);
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{text}</span>
    </div>
  );
}
