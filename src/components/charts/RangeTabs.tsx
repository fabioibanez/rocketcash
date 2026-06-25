"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: "mtd", label: "This month" },
  { id: "30d", label: "30 days" },
  { id: "3m", label: "3 months" },
];

export function RangeTabs({ active }: { active: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "mtd") params.delete("range");
    else params.set("range", id);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {RANGES.map((r) => (
        <Link
          key={r.id}
          href={hrefFor(r.id)}
          prefetch={process.env.NODE_ENV === "production"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active === r.id
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
