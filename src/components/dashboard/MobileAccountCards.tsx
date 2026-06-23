import { cn, formatCurrency } from "@/lib/utils";
import type { AccountSummary } from "@/lib/queries";

export function MobileAccountCards({
  accounts,
}: {
  accounts: AccountSummary[];
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
      {accounts.map((a) => (
        <div
          key={a.id}
          className="min-w-[180px] snap-start rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                a.type === "liability" ? "bg-destructive" : "bg-success",
              )}
            />
            <p className="truncate text-xs text-muted-foreground">
              {a.institutionName ?? "Bank"}
            </p>
          </div>
          <p className="mt-2 truncate text-sm font-medium">{a.name}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(a.currentBalance, a.currency)}
          </p>
        </div>
      ))}
    </div>
  );
}
