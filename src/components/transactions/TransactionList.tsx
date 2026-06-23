"use client";

import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { TransactionRow } from "@/lib/queries";

// Plaid convention: positive amount = money out, negative = money in.
function amountDisplay(amount: number, currency: string) {
  const isInflow = amount < 0;
  const abs = Math.abs(amount);
  const sign = isInflow ? "+" : "-";
  return {
    text: `${sign}${formatCurrency(abs, currency)}`,
    isInflow,
  };
}

function MerchantIcon({ txn }: { txn: TransactionRow }) {
  const label = (txn.merchantName ?? txn.name).charAt(0).toUpperCase();
  if (txn.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={txn.logoUrl}
        alt=""
        className="h-9 w-9 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
      {label}
    </div>
  );
}

export function TransactionList({
  transactions,
  compact = false,
}: {
  transactions: TransactionRow[];
  compact?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <div>
      {/* Mobile / compact: card-like rows */}
      <ul className={cn("divide-y divide-border", !compact && "md:hidden")}>
        {transactions.map((t) => {
          const amt = amountDisplay(t.amount, t.currency);
          return (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <MerchantIcon txn={t} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {t.merchantName ?? t.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(t.date)}
                  {t.category ? ` · ${t.category}` : ""}
                  {!compact ? ` · ${t.accountName}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-semibold tabular-nums",
                    amt.isInflow && "text-success",
                  )}
                >
                  {amt.text}
                </p>
                {t.pending && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Pending
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: dense table */}
      {!compact && (
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 pr-4 font-medium">Merchant</th>
                <th className="py-2.5 pr-4 font-medium">Category</th>
                <th className="py-2.5 pr-4 font-medium">Account</th>
                <th className="py-2.5 pl-4 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => {
                const amt = amountDisplay(t.amount, t.currency);
                return (
                  <tr key={t.id} className="hover:bg-accent/40">
                    <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                      {formatDate(t.date)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <MerchantIcon txn={t} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {t.merchantName ?? t.name}
                          </p>
                          {t.pending && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {t.category ? (
                        <Badge variant="muted">{t.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {t.accountName}
                    </td>
                    <td
                      className={cn(
                        "py-3 pl-4 text-right font-semibold tabular-nums",
                        amt.isInflow && "text-success",
                      )}
                    >
                      {amt.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
