import { getSession } from "@/lib/session";
import { getCashFlow } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { CashFlowChart } from "@/components/charts/CashFlowChart";

const MONTHS = 6;

export default async function CashFlowPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const { data, totals, currency } = await getCashFlow(userId, MONTHS);
  const avgNet = totals.net / MONTHS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash flow</h1>
        <p className="text-sm text-muted-foreground">
          Income vs. spending over the last {MONTHS} months
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Income"
          value={formatCurrency(totals.income, currency)}
          tone="income"
        />
        <Stat
          label="Spending"
          value={formatCurrency(totals.expenses, currency)}
          tone="expense"
        />
        <Stat
          label="Net savings"
          value={`${totals.net >= 0 ? "+" : ""}${formatCurrency(totals.net, currency)}`}
        />
        <Stat
          label="Avg / month"
          value={`${avgNet >= 0 ? "+" : ""}${formatCurrency(avgNet, currency)}`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Monthly cash flow</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Legend color="var(--income)" label="Income" />
            <Legend color="var(--expense)" label="Spending" />
          </div>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={data} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Month</th>
                <th className="py-2 pr-4 text-right font-medium">Income</th>
                <th className="py-2 pr-4 text-right font-medium">Spending</th>
                <th className="py-2 pl-4 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...data].reverse().map((m) => (
                <tr key={m.month}>
                  <td className="py-2.5 pr-4 font-medium">
                    {new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--income)]">
                    {formatCurrency(m.income, currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--expense)]">
                    {formatCurrency(m.expenses, currency)}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-semibold tabular-nums">
                    {m.net >= 0 ? "+" : ""}
                    {formatCurrency(m.net, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
