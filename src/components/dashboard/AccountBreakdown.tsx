import { cn, formatCurrency } from "@/lib/utils";
import type { AccountSummary } from "@/lib/queries";

function AccountRow({ account }: { account: AccountSummary }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {account.institutionName ?? "Bank"}
          {account.mask ? ` ····${account.mask}` : ""}
        </p>
      </div>
      <p className="ml-3 shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(account.currentBalance, account.currency)}
      </p>
    </div>
  );
}

export function AccountBreakdown({ accounts }: { accounts: AccountSummary[] }) {
  const assets = accounts.filter((a) => a.type === "asset");
  const liabilities = accounts.filter((a) => a.type === "liability");

  const assetTotal = assets.reduce((s, a) => s + a.currentBalance, 0);
  const liabilityTotal = liabilities.reduce((s, a) => s + a.currentBalance, 0);
  const currency = accounts[0]?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <Section
        title="Assets"
        total={assetTotal}
        currency={currency}
        accounts={assets}
        tone="success"
        empty="No asset accounts linked."
      />
      <Section
        title="Liabilities"
        total={liabilityTotal}
        currency={currency}
        accounts={liabilities}
        tone="destructive"
        empty="No liabilities. Nice."
      />
    </div>
  );
}

function Section({
  title,
  total,
  currency,
  accounts,
  tone,
  empty,
}: {
  title: string;
  total: number;
  currency: string;
  accounts: AccountSummary[];
  tone: "success" | "destructive";
  empty: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              tone === "success" ? "bg-success" : "bg-destructive",
            )}
          />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(total, currency)}
        </span>
      </div>
      {accounts.length > 0 ? (
        <div className="divide-y divide-border">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
        </div>
      ) : (
        <p className="py-3 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
