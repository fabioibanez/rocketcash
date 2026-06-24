import { TransactionListSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <TransactionListSkeleton rows={10} />;
}
