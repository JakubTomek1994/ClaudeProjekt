"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CUSTOMER_SOURCE_LABELS } from "@/lib/case/labels";

const SOURCE_OPTIONS = [
  { value: "", label: "Všechny zdroje" },
  ...Object.entries(CUSTOMER_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CustomersFilters({
  initialSource,
  initialQ,
}: {
  initialSource: string;
  initialQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    router.push(`/customers?${params.toString()}`);
  }

  function onSearchSubmit(formData: FormData) {
    update("q", String(formData.get("q") ?? "").trim());
  }

  const hasFilters = !!(initialSource || initialQ);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form action={onSearchSubmit} className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={initialQ}
          placeholder="Hledat (email, jméno, telefon, IČO…)"
          className={inputClass}
        />
      </form>

      <select
        className={selectClass}
        defaultValue={initialSource}
        onChange={(e) => update("source", e.target.value)}
        aria-label="Zdroj"
      >
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button render={<Link href="/customers" />} variant="ghost" size="sm">
          <X className="mr-1 h-3.5 w-3.5" />
          Zrušit filtry
        </Button>
      )}
    </div>
  );
}
