"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CaseStatus, CaseType } from "@/generated/prisma/client";
import { changeCaseStatus } from "@/lib/actions/cases";
import { CASE_STATUS_LABELS } from "@/lib/case/labels";
import { allowedNextStatuses } from "@/lib/case/workflow";

export function StatusSelect({
  caseId,
  type,
  currentStatus,
}: {
  caseId: string;
  type: CaseType;
  currentStatus: CaseStatus;
}) {
  const [pending, startTransition] = useTransition();
  const next = allowedNextStatuses(type, currentStatus);

  function transitionTo(status: CaseStatus) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("caseId", caseId);
      fd.set("status", status);
      await changeCaseStatus(fd);
    });
  }

  if (next.length === 0) {
    return (
      <Button variant="outline" disabled className="gap-1">
        Konečný stav
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={pending} />}>
        {pending ? "Měním…" : "Změnit stav"}
        <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs">Přesunout do</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {next.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => transitionTo(status)}
            disabled={pending}
            variant={status === "REJECTED" || status === "CANCELLED" ? "destructive" : "default"}
          >
            {CASE_STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
