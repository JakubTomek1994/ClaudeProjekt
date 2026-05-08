"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/case/labels";

const TYPE_OPTIONS = [
  { value: "", label: "Všechny typy" },
  { value: "REKLAMACE", label: CASE_TYPE_LABELS.REKLAMACE },
  { value: "ODSTOUPENI", label: CASE_TYPE_LABELS.ODSTOUPENI },
];

const STATUS_OPTIONS = [
  { value: "", label: "Všechny stavy" },
  { value: "ACTIVE", label: "Aktivní (nedořešené)" },
  ...Object.entries(CASE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CasesFilters({
  initialType,
  initialStatus,
  initialQ,
}: {
  initialType: string;
  initialStatus: string;
  initialQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    router.push(`/cases?${params.toString()}`);
  }

  function onSearchSubmit(formData: FormData) {
    update("q", String(formData.get("q") ?? "").trim());
  }

  const hasFilters = !!(initialType || initialStatus || initialQ);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form
        action={onSearchSubmit}
        className="relative flex-1 min-w-[220px] max-w-md"
      >
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={initialQ}
          placeholder="Hledat (číslo, email, jméno…)"
          className={inputClass}
        />
      </form>

      <select
        className={selectClass}
        defaultValue={initialType}
        onChange={(e) => update("type", e.target.value)}
        aria-label="Typ případu"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={initialStatus}
        onChange={(e) => update("status", e.target.value)}
        aria-label="Stav"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button render={<Link href="/cases" />} variant="ghost" size="sm">
          <X className="mr-1 h-3.5 w-3.5" />
          Zrušit filtry
        </Button>
      )}
    </div>
  );
}
