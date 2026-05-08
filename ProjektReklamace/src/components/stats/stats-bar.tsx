import { cn } from "@/lib/utils";

export function StatsBar({
  value,
  max,
  className,
  accent = "neutral",
}: {
  value: number;
  max: number;
  className?: string;
  accent?: "neutral" | "brand" | "muted";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fillClass = {
    neutral: "bg-foreground/70",
    brand: "bg-brand",
    muted: "bg-muted-foreground/40",
  }[accent];

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted/60", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", fillClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
