"use client";

import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { CategorySpend } from "@/lib/queries";
import { CategoryDonut, colorFor } from "./CategoryDonut";

type Mode = "spending" | "income";

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
                  style={{ backgroundColor: colorFor(i) }}
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
