import { Suspense } from "react";
import { getSession } from "@/auth";
import { getTransactionsPage } from "@/lib/queries";
import { TransactionSearch } from "@/components/transactions/TransactionSearch";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Pagination } from "@/components/transactions/Pagination";
import { TransactionListSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent } from "@/components/ui/card";

async function TransactionsList({
  userId,
  query,
  page,
}: {
  userId: string;
  query: string;
  page: number;
}) {
  const { transactions, total, totalPages } = await getTransactionsPage(userId, {
    query,
    page,
    pageSize: 25,
  });

  return (
    <>
      <Card>
        <CardContent className="p-4 md:p-5">
          <TransactionList transactions={transactions} />
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} />
    </>
  );
}

export default async function TransactionsPage(props: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;

  const searchParams = await props.searchParams;
  const query = searchParams.query ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          {query ? `Searching for “${query}”` : "All transactions"}
        </p>
      </div>

      <TransactionSearch />

      <Suspense
        key={`${query}:${page}`}
        fallback={<TransactionListSkeleton rows={10} />}
      >
        <TransactionsList userId={userId} query={query} page={page} />
      </Suspense>
    </div>
  );
}
