"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CaseType } from "@/generated/prisma/client";
import type { PdfDocType } from "@/lib/pdf/generate";

type Option = {
  type: PdfDocType;
  label: string;
  hint: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function GeneratePdfMenu({
  caseId,
  caseType,
  hasDecision,
  hasResolution,
}: {
  caseId: string;
  caseType: CaseType;
  hasDecision: boolean;
  hasResolution: boolean;
}) {
  const options: Option[] =
    caseType === "REKLAMACE"
      ? [
          {
            type: "claim_protocol",
            label: "Reklamační protokol",
            hint: "Potvrzení o přijetí reklamace",
          },
          {
            type: "resolution_protocol",
            label: "Protokol o vyřízení",
            hint: hasDecision || hasResolution
              ? "Rozhodnutí o reklamaci"
              : "Až po rozhodnutí",
            disabled: !hasDecision && !hasResolution,
            disabledReason: "Nejprve rozhodněte o reklamaci.",
          },
        ]
      : [
          {
            type: "withdrawal_form",
            label: "Formulář pro odstoupení",
            hint: "Dle nař. vlády č. 363/2013 Sb.",
          },
          {
            type: "resolution_protocol",
            label: "Protokol o vyřízení",
            hint: hasResolution ? "Vyřízeno" : "Až po vyřízení",
            disabled: !hasResolution,
            disabledReason: "Až po vyřízení odstoupení.",
          },
        ];

  function open(type: PdfDocType) {
    window.open(`/api/cases/${caseId}/pdf/${type}`, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        Vygenerovat PDF
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">Dostupné dokumenty</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.type}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && open(opt.type)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-[11px] text-muted-foreground">
              {opt.disabled ? opt.disabledReason : opt.hint}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
