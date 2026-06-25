import { getSession } from "@/lib/session";
import { getCategoryBreakdown, type ReportRange } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RangeTabs } from "@/components/charts/RangeTabs";
import { ReportsView } from "@/components/charts/ReportsView";

function parseRange(value: string | undefined): ReportRange {
  return value === "30d" || value === "3m" ? value : "mtd";
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;

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
