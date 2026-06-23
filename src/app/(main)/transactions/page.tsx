import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { TransactionSearch } from "@/components/transactions/TransactionSearch";
import { TransactionsContent } from "@/components/transactions/TransactionsContent";
import { TransactionListSkeleton } from "@/components/ui/skeletons";

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
        <TransactionsContent userId={userId} query={query} page={page} />
      </Suspense>
    </div>
  );
}
