"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { triggerDeadlineCheck } from "@/lib/actions/notifications";

export function RunCronButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const handleClick = () => {
    startTransition(async () => {
      const res = await triggerDeadlineCheck();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { result } = res;
      setLastRunAt(new Date());
      if (result.created === 0) {
        toast.success(`Kontrola dokončena · ${result.scannedCases} případů, žádné nové notifikace.`);
      } else {
        toast.success(
          `Vygenerováno ${result.created} ${result.created === 1 ? "notifikace" : result.created < 5 ? "notifikace" : "notifikací"} (${result.scannedCases} případů).`,
        );
      }
      if (result.errors.length > 0) {
        toast.warning(`Některé případy selhaly: ${result.errors.length}`);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "Spouštím…" : "Spustit kontrolu lhůt"}
      </Button>
      {lastRunAt && !isPending && (
        <span className="text-xs text-muted-foreground">
          Naposledy {lastRunAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
