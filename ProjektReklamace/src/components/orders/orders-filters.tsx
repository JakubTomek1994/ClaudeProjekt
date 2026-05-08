"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OrdersFilters({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    params.delete("page");
    router.push(`/orders?${params.toString()}`);
  }

  function onSearchSubmit(formData: FormData) {
    update(String(formData.get("q") ?? "").trim());
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form action={onSearchSubmit} className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={initialQ}
          placeholder="Hledat (číslo objednávky, email zákazníka)"
          className={inputClass}
        />
      </form>
      {initialQ && (
        <Button render={<Link href="/orders" />} variant="ghost" size="sm">
          <X className="mr-1 h-3.5 w-3.5" />
          Zrušit
        </Button>
      )}
    </div>
  );
}
