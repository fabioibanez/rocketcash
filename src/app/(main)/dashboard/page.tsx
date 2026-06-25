import Link from "next/link";
import { ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { getSession } from "@/auth";
import {
  getDashboardData,
  computeNetWorth,
  getCashFlow,
} from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stat,
} from "@/components/ui/card";
import { NetWorthChart } from "@/components/transactions/NetWorthChart";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AccountBreakdown } from "@/components/dashboard/AccountBreakdown";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";
import type { AccountSummary } from "@/lib/queries";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const { accounts, history, recent } = await getDashboardData(userId);

  if (accounts.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold">Welcome to RocketCash</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Link your first bank account to start tracking your net worth and
          transactions.
        </p>
        <div className="mt-6">
          <PlaidLinkButton />
        </div>
      </div>
    );
  }

  const { assets, liabilities, netWorth } = computeNetWorth(accounts);
  const currency = accounts[0]?.currency ?? "USD";
  const { totals: month } = await getCashFlow(userId, 1);

  return (
    <div className="space-y-6">
      {/* Net worth hero */}
      <div>
        <p className="text-sm text-muted-foreground">Net worth</p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
          {formatCurrency(netWorth, currency)}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Assets" value={formatCurrency(assets, currency)} tone="income" />
        <Stat
          label="Liabilities"
          value={formatCurrency(liabilities, currency)}
          tone="expense"
        />
        <Stat label="Income this month" value={formatCurrency(month.income, currency)} />
        <Stat label="Spending this month" value={formatCurrency(month.expenses, currency)} />
      </div>

      {/* Mobile: swipeable account balances */}
      <div className="md:hidden">
        <MobileAccountCards accounts={accounts} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Net worth over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthChart data={history} currency={currency} />
        </CardContent>
      </Card>

      {/* Breakdown + recent transactions */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="hidden lg:col-span-2 lg:block">
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountBreakdown accounts={accounts} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={recent} compact />
          </CardContent>
        </Card>

        {/* Mobile breakdown below transactions */}
        <Card className="lg:hidden">
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountBreakdown accounts={accounts} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MobileAccountCards({ accounts }: { accounts: AccountSummary[] }) {
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
