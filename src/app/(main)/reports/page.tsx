import { PieChart } from "lucide-react";
import { getSession } from "@/auth";
import {
  getCategoryBreakdown,
  countLinkedAccounts,
  type ReportRange,
} from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RangeTabs, ReportsView } from "@/components/charts/ReportsView";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";

function parseRange(value: string | undefined): ReportRange {
  return value === "30d" || value === "3m" ? value : "mtd";
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;

  if ((await countLinkedAccounts(userId)) === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PieChart className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold">No reports yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Link a bank account to see where your money goes by category.
        </p>
        <div className="mt-6">
          <PlaidLinkButton />
        </div>
      </div>
    );
  }

  const { range: rawRange } = await props.searchParams;
  const range = parseRange(rawRange);

  const breakdown = await getCategoryBreakdown(userId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Where your money goes · {breakdown.rangeLabel.toLowerCase()}
          </p>
        </div>
        <RangeTabs active={range} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By category</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsView
            spending={breakdown.spending}
            totalSpending={breakdown.totalSpending}
            income={breakdown.income}
            totalIncome={breakdown.totalIncome}
            currency={breakdown.currency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
