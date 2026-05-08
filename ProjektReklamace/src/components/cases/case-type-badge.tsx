import type { CaseType } from "@/generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { CASE_TYPE_LABELS_SHORT } from "@/lib/case/labels";

export function CaseTypeBadge({ type }: { type: CaseType }) {
  const isReklamace = type === "REKLAMACE";
  return (
    <Badge
      variant="outline"
      className={
        isReklamace
          ? "border-[oklch(0.55_0.225_22/0.3)] bg-brand-soft font-medium tracking-wide uppercase text-[10px]"
          : "border-border bg-secondary text-secondary-foreground font-medium tracking-wide uppercase text-[10px]"
      }
    >
      {CASE_TYPE_LABELS_SHORT[type]}
    </Badge>
  );
}
