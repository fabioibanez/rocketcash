import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "income" | "expense";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {tone !== "default" && (
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: tone === "income" ? "var(--income)" : "var(--expense)",
            }}
          />
        )}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "income" && "text-[var(--income)]",
          tone === "expense" && "text-[var(--expense)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
