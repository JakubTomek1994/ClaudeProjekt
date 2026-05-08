import Link from "next/link";
import { addDays, subDays } from "date-fns";
import { ArrowUpRight, Inbox, Plus, ShieldCheck, Hourglass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseTypeBadge } from "@/components/cases/case-type-badge";
import { DeadlinePill } from "@/components/cases/deadline-pill";
import { RunCronButton } from "@/components/dashboard/run-cron-button";
import { isTerminal } from "@/lib/case/workflow";
import { formatDate, formatRelative } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Dashboard – Reklamace",
};

const ACTIVE_NOT_IN = ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED"] as const;

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "Uživateli";
  const isAdmin = session?.user?.role === "ADMIN";
  const now = new Date();
  const deadlineSoon = addDays(now, 7);
  const stagnationCutoff = subDays(now, 5);

  const [
    activeReklamace,
    activeOdstoupeni,
    draftCount,
    nearDeadlineCount,
    overdueCount,
    attentionCases,
    stagnantCases,
  ] = await Promise.all([
    prisma.case.count({
      where: { type: "REKLAMACE", status: { notIn: [...ACTIVE_NOT_IN] } },
    }),
    prisma.case.count({
      where: { type: "ODSTOUPENI", status: { notIn: [...ACTIVE_NOT_IN] } },
    }),
    prisma.case.count({ where: { isDraft: true } }),
    prisma.case.count({
      where: {
        status: { notIn: [...ACTIVE_NOT_IN] },
        deadlineAt: { lte: deadlineSoon, gte: now },
      },
    }),
    prisma.case.count({
      where: {
        status: { notIn: [...ACTIVE_NOT_IN] },
        deadlineAt: { lt: now },
      },
    }),
    prisma.case.findMany({
      where: {
        OR: [
          { isDraft: true },
          {
            status: { notIn: [...ACTIVE_NOT_IN] },
            deadlineAt: { lte: deadlineSoon },
          },
        ],
      },
      orderBy: [{ isDraft: "desc" }, { deadlineAt: "asc" }],
      take: 6,
      select: {
        id: true,
        caseNumber: true,
        type: true,
        status: true,
        isDraft: true,
        deadlineAt: true,
        receivedAt: true,
        customer: { select: { name: true, email: true } },
      },
    }),
    prisma.case.findMany({
      where: {
        status: { notIn: [...ACTIVE_NOT_IN] },
        isDraft: false,
        updatedAt: { lt: stagnationCutoff },
      },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: {
        id: true,
        caseNumber: true,
        type: true,
        status: true,
        deadlineAt: true,
        updatedAt: true,
        customer: { select: { name: true, email: true } },
      },
    }),
  ]);

  const totalActive = activeReklamace + activeOdstoupeni;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="small-caps text-[10px] text-muted-foreground/85">
          Přehled · {formatDate(now)}
        </p>
        <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
          Vítejte zpět, {userName}.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          {totalActive === 0
            ? "Aktuálně nemáte žádné aktivní případy. Klid před bouří."
            : `Aktuálně ${totalActive} ${totalActive === 1 ? "aktivní případ" : totalActive < 5 ? "aktivní případy" : "aktivních případů"} čeká na vaši pozornost.`}
        </p>
        <div
          aria-hidden
          className="h-px w-full bg-gradient-to-r from-border via-border to-transparent"
        />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          eyebrow="Aktivní reklamace"
          value={activeReklamace}
          hint="30 dní lhůta · R-YYYY-NNN"
          accent="brand"
        />
        <MetricCard
          eyebrow="Aktivní odstoupení"
          value={activeOdstoupeni}
          hint="14 dní lhůta · O-YYYY-NNN"
          accent="dark"
        />
        <MetricCard
          eyebrow="Drafty ke zpracování"
          value={draftCount}
          hint="Z příchozích emailů (Fáze 2)"
          accent="muted"
        />
        <MetricCard
          eyebrow="Lhůty ≤ 7 dní"
          value={nearDeadlineCount}
          hint={overdueCount > 0 ? `${overdueCount} po lhůtě` : "Vše v termínu"}
          accent={overdueCount > 0 ? "urgent" : nearDeadlineCount > 0 ? "brand" : "muted"}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="small-caps text-[10px] text-muted-foreground/85">
              Vyžaduje pozornost
            </p>
            <h2 className="font-display text-2xl font-medium tracking-tight">
              Drafty a blížící se lhůty
            </h2>
          </div>
          <Button render={<Link href="/cases" />} variant="outline" size="sm">
            Otevřít všechny případy
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>

        {attentionCases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-display text-lg font-medium">Vše pod kontrolou.</p>
                <p className="text-sm text-muted-foreground">
                  Žádné drafty, žádné případy s blížící se lhůtou.
                </p>
              </div>
              <Button render={<Link href="/cases/new" />} variant="outline" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Založit nový případ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y divide-border">
              {attentionCases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="font-mono text-sm font-medium tabular">
                      {c.caseNumber}
                    </span>
                    <CaseTypeBadge type={c.type} />
                    {c.isDraft ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                        Draft
                      </span>
                    ) : (
                      <CaseStatusBadge status={c.status} />
                    )}
                    <div className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">
                        {c.customer.name ?? c.customer.email}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {c.customer.email}
                      </span>
                    </div>
                    <DeadlinePill
                      deadline={c.deadlineAt}
                      isResolved={isTerminal(c.status)}
                      showDate={false}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {stagnantCases.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="small-caps text-[10px] text-muted-foreground/85">
                Stagnující případy
              </p>
              <h2 className="font-display text-2xl font-medium tracking-tight">
                Bez aktivity 5 a více dní
              </h2>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y divide-border">
              {stagnantCases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm font-medium tabular">
                      {c.caseNumber}
                    </span>
                    <CaseTypeBadge type={c.type} />
                    <CaseStatusBadge status={c.status} />
                    <div className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">
                        {c.customer.name ?? c.customer.email}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Aktivita {formatRelative(c.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickAction
          icon={Plus}
          eyebrow="Akce"
          title="Založit nový případ"
          description="Reklamace nebo odstoupení od smlouvy. Pro telefon, email i osobní jednání."
          href="/cases/new"
        />
        <QuickAction
          icon={Inbox}
          eyebrow="Připraveno"
          title="Importovat ze Shoptetu"
          description="CSV export zákazníků a objednávek. Upsert podle emailu / čísla objednávky."
          href="/import"
        />
      </section>

      {isAdmin && (
        <section className="space-y-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
          <div>
            <p className="small-caps text-[10px] text-muted-foreground/85">
              Administrace
            </p>
            <h3 className="font-display text-base font-medium tracking-tight">
              Manuální spuštění kontroly lhůt
            </h3>
            <p className="text-xs text-muted-foreground">
              Cron běží denně v 8:00 (Europe/Prague). Pro vývoj a ad‑hoc kontrolu lze spustit ručně.
            </p>
          </div>
          <RunCronButton />
        </section>
      )}
    </div>
  );
}

function MetricCard({
  eyebrow,
  value,
  hint,
  accent,
}: {
  eyebrow: string;
  value: number;
  hint?: string;
  accent: "brand" | "dark" | "muted" | "urgent";
}) {
  const valueClass = {
    brand: "text-foreground",
    dark: "text-foreground",
    muted: "text-muted-foreground",
    urgent: "text-brand",
  }[accent];

  const dotClass = {
    brand: "bg-brand",
    dark: "bg-foreground",
    muted: "bg-muted-foreground/40",
    urgent: "bg-brand animate-pulse",
  }[accent];

  return (
    <Card className="relative overflow-hidden border-border/80">
      {accent === "urgent" && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-brand" />
      )}
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
          <span className="small-caps text-muted-foreground">{eyebrow}</span>
        </div>
        <div
          className={`font-display text-5xl font-semibold leading-none tracking-tight tabular ${valueClass}`}
        >
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  eyebrow,
  title,
  description,
  href,
}: {
  icon: typeof Plus;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-lg border bg-card p-5 transition-all hover:border-foreground/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="small-caps text-[10px] text-muted-foreground">{eyebrow}</p>
          <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md border bg-background p-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
