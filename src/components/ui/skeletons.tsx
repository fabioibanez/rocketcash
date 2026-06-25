import { Card, CardContent } from "@/components/ui/card";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function TransactionListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="divide-y divide-border">
          {Array.from({ length: rows }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border p-5">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-10 w-56 animate-pulse rounded bg-muted" />
      </div>
      <StatRowSkeleton count={3} />
      <div className="h-[320px] animate-pulse rounded-2xl border border-border bg-card" />
      <TransactionListSkeleton rows={5} />
    </div>
  );
}
