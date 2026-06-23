import { getTransactionsPage } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Pagination } from "@/components/transactions/Pagination";

export async function TransactionsContent({
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
