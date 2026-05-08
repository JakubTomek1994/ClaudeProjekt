"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

type NotificationType =
  | "DEADLINE_WARNING_7D"
  | "DEADLINE_WARNING_3D"
  | "DEADLINE_TODAY"
  | "DEADLINE_PASSED"
  | "STAGNANT_CASE"
  | "NEW_CASE_DRAFT"
  | "CUSTOMER_REPLIED"
  | "CASE_ASSIGNED";

type NotificationItem = {
  id: string;
  caseId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  case: { caseNumber: string } | null;
};

type Payload = { items: NotificationItem[]; unreadCount: number };

const TYPE_DOT: Record<NotificationType, string> = {
  DEADLINE_PASSED: "bg-brand",
  DEADLINE_TODAY: "bg-brand",
  DEADLINE_WARNING_3D: "bg-amber-500",
  DEADLINE_WARNING_7D: "bg-amber-400",
  STAGNANT_CASE: "bg-blue-500",
  NEW_CASE_DRAFT: "bg-emerald-500",
  CUSTOMER_REPLIED: "bg-emerald-500",
  CASE_ASSIGNED: "bg-foreground/60",
};

function relativeCs(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "právě teď";
  if (diffSec < 3600) return `před ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86_400) return `před ${Math.floor(diffSec / 3600)} h`;
  const days = Math.floor(diffSec / 86_400);
  return `před ${days} ${days === 1 ? "dnem" : days < 5 ? "dny" : "dny"}`;
}

export function NotificationBell() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) return;
      const json = (await res.json()) as Payload;
      setData(json);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        console.error("[notifications] fetch failed", e);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      abortRef.current?.abort();
    };
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      void refresh();
    },
    [refresh],
  );

  const markAll = useCallback(() => {
    startTransition(async () => {
      await fetch("/api/notifications/read-all", { method: "POST" });
      await refresh();
    });
  }, [refresh]);

  const handleItemClick = (n: NotificationItem) => {
    setOpen(false);
    if (!n.readAt) void markRead(n.id);
    if (n.caseId) router.push(`/cases/${n.caseId}`);
  };

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Notifikace" />}
      >
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-label={`${unread} nepřečtených`}
              className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-semibold leading-none text-brand-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border/80 px-3 py-2">
          <div className="flex flex-col">
            <span className="small-caps text-[10px] text-muted-foreground/85">
              Notifikace
            </span>
            <span className="text-sm font-medium">
              {unread > 0 ? `${unread} nepřečtených` : "Vše přečteno"}
            </span>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAll}
              disabled={isPending}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Označit vše
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Žádné notifikace.
          </div>
        ) : (
          <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    !n.readAt && "bg-muted/20",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                      TYPE_DOT[n.type],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          n.readAt ? "font-normal text-muted-foreground" : "font-medium",
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground/85">
                        {relativeCs(n.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.message}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border/80 px-3 py-2 text-center">
          <Link
            href="/cases"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Otevřít všechny případy
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
