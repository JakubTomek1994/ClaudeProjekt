import { daysToDeadline, deadlineUrgency } from "@/lib/case/deadline";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const URGENCY_CLASSES = {
  passed:
    "bg-[oklch(0.55_0.225_22)] text-white",
  today:
    "bg-[oklch(0.55_0.225_22)] text-white",
  warning:
    "bg-brand-soft text-[oklch(0.42_0.18_22)] dark:bg-[oklch(0.32_0.12_22)] dark:text-[oklch(0.92_0.08_22)]",
  soon: "bg-foreground/8 text-foreground",
  ok: "bg-muted text-muted-foreground",
} as const;

export function DeadlinePill({
  deadline,
  isResolved,
  showDate = true,
}: {
  deadline: Date;
  isResolved?: boolean;
  showDate?: boolean;
}) {
  const days = daysToDeadline(deadline);
  const urgency = deadlineUrgency(deadline);

  const label = (() => {
    if (isResolved) return "Vyřízeno";
    if (urgency === "passed") return `Po lhůtě (${Math.abs(days)} d.)`;
    if (urgency === "today") return "Lhůta dnes";
    return `${days} d.`;
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider tabular",
        isResolved ? URGENCY_CLASSES.ok : URGENCY_CLASSES[urgency],
      )}
      title={`Lhůta: ${formatDate(deadline)}`}
    >
      {label}
      {showDate && !isResolved && (
        <span className="text-[10px] font-normal normal-case opacity-80 tracking-normal">
          {formatDate(deadline)}
        </span>
      )}
    </span>
  );
}
