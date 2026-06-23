"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (totalPages <= 1) return null;

  const prevHref = hrefFor(page - 1);
  const nextHref = hrefFor(page + 1);
  const btnClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
        {total !== undefined ? ` · ${total.toLocaleString()} total` : ""}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <span className={cn(btnClass, "pointer-events-none opacity-50")}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        ) : (
          <Link href={prevHref} prefetch className={btnClass}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        )}
        {page >= totalPages ? (
          <span className={cn(btnClass, "pointer-events-none opacity-50")}>
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link href={nextHref} prefetch className={btnClass}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
