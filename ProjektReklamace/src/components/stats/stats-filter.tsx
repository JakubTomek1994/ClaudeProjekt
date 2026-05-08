"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CASE_TYPE_LABELS } from "@/lib/case/labels";
import {
  PERIOD_LABEL,
  STATS_PERIODS,
  type StatsPeriod,
} from "@/lib/stats/types";

const TYPE_OPTIONS = [
  { value: "", label: "Všechny typy" },
  { value: "REKLAMACE", label: CASE_TYPE_LABELS.REKLAMACE },
  { value: "ODSTOUPENI", label: CASE_TYPE_LABELS.ODSTOUPENI },
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function StatsFilter({
  initialPeriod,
  initialType,
}: {
  initialPeriod: StatsPeriod;
  initialType: "" | "REKLAMACE" | "ODSTOUPENI";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`/stats?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <select
        className={selectClass}
        defaultValue={initialPeriod}
        onChange={(e) => update("period", e.target.value)}
        aria-label="Období"
      >
        {STATS_PERIODS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABEL[p]}
          </option>
        ))}
      </select>

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
    </div>
  );
}
