import Link from "next/link";
import { ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { getSession } from "@/lib/session";
import {
  getDashboardData,
  computeNetWorth,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NetWorthChart } from "@/components/transactions/NetWorthChart";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AccountBreakdown } from "@/components/dashboard/AccountBreakdown";
import { MobileAccountCards } from "@/components/dashboard/MobileAccountCards";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const { accounts, history, recent } = await getDashboardData(userId);

  const { assets, liabilities, netWorth } = computeNetWorth(accounts);
  const currency = accounts[0]?.currency ?? "USD";

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header / net worth */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Net worth</p>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(netWorth, currency)}
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Assets</p>
            <p className="text-lg font-semibold text-success tabular-nums">
              {formatCurrency(assets, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Liabilities</p>
            <p className="text-lg font-semibold text-destructive tabular-nums">
              {formatCurrency(liabilities, currency)}
            </p>
          </div>
        </div>
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
