"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import type { CategorySpend } from "@/lib/queries";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const RANGES = [
  { id: "mtd", label: "This month" },
  { id: "30d", label: "30 days" },
  { id: "3m", label: "3 months" },
];

type Mode = "spending" | "income";

export function RangeTabs({ active }: { active: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "mtd") params.delete("range");
    else params.set("range", id);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {RANGES.map((r) => (
        <Link
          key={r.id}
          href={hrefFor(r.id)}
          prefetch={process.env.NODE_ENV === "production"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active === r.id
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}

function CategoryDonut({
  rows,
  total,
  currency,
  label,
}: {
  rows: CategorySpend[];
  total: number;
  currency: string;
  label: string;
}) {
  const top = rows.slice(0, 5);
  const restTotal = rows.slice(5).reduce((s, r) => s + r.amount, 0);
  const slices =
    restTotal > 0
      ? [...top, { category: "Other", amount: restTotal, share: restTotal / total }]
      : top;

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
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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

export function ReportsView({
  spending,
  totalSpending,
  income,
  totalIncome,
  currency,
}: {
  spending: CategorySpend[];
  totalSpending: number;
  income: CategorySpend[];
  totalIncome: number;
  currency: string;
}) {
  const [mode, setMode] = useState<Mode>("spending");
  const rows = mode === "spending" ? spending : income;
  const total = mode === "spending" ? totalSpending : totalIncome;

  return (
    <div>
      <div className="inline-flex rounded-full border border-border bg-secondary p-1">
        {(["spending", "income"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No {mode} recorded for this period.
        </p>
      ) : (
        <div className="mt-5 grid items-center gap-6 md:grid-cols-2">
          <CategoryDonut
            rows={rows}
            total={total}
            currency={currency}
            label={mode === "spending" ? "Total spent" : "Total earned"}
          />

          <ul className="space-y-1">
            {rows.slice(0, 8).map((r, i) => (
              <li
                key={r.category}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.category}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {Math.round(r.share * 100)}%
                </span>
                <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(r.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
