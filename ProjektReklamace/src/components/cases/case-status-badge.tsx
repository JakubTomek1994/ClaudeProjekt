import type { CaseStatus } from "@/generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { CASE_STATUS_LABELS } from "@/lib/case/labels";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "active" | "warn" | "success" | "danger" | "muted";

const STATUS_TONE: Record<CaseStatus, Tone> = {
  NEW: "neutral",
  UNDER_REVIEW: "active",
  WAITING_CUSTOMER: "warn",
  WITH_SUPPLIER: "active",
  DECIDED: "active",
  WAITING_RETURN: "warn",
  GOODS_RECEIVED: "active",
  REFUND_PENDING: "active",
  RESOLVED: "success",
  CLOSED: "muted",
  REJECTED: "danger",
  CANCELLED: "muted",
};

const TONE_CLASSES: Record<Tone, string> = {
  neutral:
    "border-border bg-card text-foreground",
  active:
    "border-foreground/15 bg-foreground/5 text-foreground",
  warn:
    "border-[oklch(0.7_0.13_70/0.4)] bg-[oklch(0.95_0.05_70)] text-[oklch(0.4_0.15_60)] dark:border-[oklch(0.55_0.13_70/0.5)] dark:bg-[oklch(0.32_0.07_60)] dark:text-[oklch(0.9_0.06_70)]",
  success:
    "border-[oklch(0.65_0.13_150/0.35)] bg-[oklch(0.96_0.04_150)] text-[oklch(0.36_0.12_150)] dark:border-[oklch(0.5_0.13_150/0.5)] dark:bg-[oklch(0.28_0.05_150)] dark:text-[oklch(0.85_0.08_150)]",
  danger:
    "border-[oklch(0.55_0.225_22/0.4)] bg-brand-soft",
  muted:
    "border-border bg-muted text-muted-foreground",
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium uppercase tracking-wide text-[10px]",
        TONE_CLASSES[STATUS_TONE[status]],
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </Badge>
  );
}
