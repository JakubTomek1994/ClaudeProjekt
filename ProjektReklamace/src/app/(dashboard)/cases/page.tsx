import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseTypeBadge } from "@/components/cases/case-type-badge";
import { CasesFilters } from "@/components/cases/cases-filters";
import { DeadlinePill } from "@/components/cases/deadline-pill";
import type { CaseStatus, CaseType, Prisma } from "@/generated/prisma/client";
import { isTerminal } from "@/lib/case/workflow";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export const metadata = { title: "Případy – Reklamace" };

export default async function CasesPage(props: {
  searchParams: Promise<{ type?: string; status?: string; q?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const where: Prisma.CaseWhereInput = {};
  if (sp.type === "REKLAMACE" || sp.type === "ODSTOUPENI") {
    where.type = sp.type as CaseType;
  }
  if (sp.status === "ACTIVE") {
    where.status = { notIn: ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED"] };
  } else if (sp.status && sp.status in CaseStatusLabels()) {
    where.status = sp.status as CaseStatus;
  }
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { caseNumber: { contains: q } },
      { customer: { email: { contains: q } } },
      { customer: { name: { contains: q } } },
      { description: { contains: q } },
    ];
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        caseNumber: true,
        type: true,
        status: true,
        receivedAt: true,
        deadlineAt: true,
        description: true,
        customer: { select: { name: true, email: true } },
        items: { select: { productName: true }, take: 1 },
        _count: { select: { items: true } },
      },
    }),
    prisma.case.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Případy"
        description={`Reklamace a odstoupení od smlouvy. Celkem ${total} ${total === 1 ? "případ" : total < 5 ? "případy" : "případů"}.`}
        actions={
          <Button render={<Link href="/cases/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nový případ
          </Button>
        }
      />

      <CasesFilters
        initialType={sp.type ?? ""}
        initialStatus={sp.status ?? ""}
        initialQ={sp.q ?? ""}
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Číslo</TableHead>
              <TableHead className="w-[120px]">Typ</TableHead>
              <TableHead className="w-[160px]">Stav</TableHead>
              <TableHead>Zákazník</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead className="w-[120px]">Přijato</TableHead>
              <TableHead className="w-[160px]">Lhůta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  Žádné případy. Začněte tlačítkem „Nový případ".
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => {
                const productLabel =
                  c._count.items === 0
                    ? "—"
                    : c._count.items === 1
                    ? c.items[0]?.productName ?? "—"
                    : `${c.items[0]?.productName ?? ""} (+${c._count.items - 1})`;

                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {c.caseNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CaseTypeBadge type={c.type} />
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.customer.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.customer.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{productLabel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.receivedAt)}
                    </TableCell>
                    <TableCell>
                      <DeadlinePill
                        deadline={c.deadlineAt}
                        isResolved={isTerminal(c.status)}
                        showDate={false}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 && (
            <Button render={<Link href={buildUrl(sp, page - 1)} />} variant="outline" size="sm">
              ← Předchozí
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Strana {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Button render={<Link href={buildUrl(sp, page + 1)} />} variant="outline" size="sm">
              Další →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CaseStatusLabels(): Record<CaseStatus, true> {
  return {
    NEW: true,
    UNDER_REVIEW: true,
    WITH_SUPPLIER: true,
    WAITING_CUSTOMER: true,
    DECIDED: true,
    WAITING_RETURN: true,
    GOODS_RECEIVED: true,
    REFUND_PENDING: true,
    RESOLVED: true,
    CLOSED: true,
    REJECTED: true,
    CANCELLED: true,
  };
}

function buildUrl(
  sp: { type?: string; status?: string; q?: string },
  page: number,
): string {
  const params = new URLSearchParams();
  if (sp.type) params.set("type", sp.type);
  if (sp.status) params.set("status", sp.status);
  if (sp.q) params.set("q", sp.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/cases?${qs}` : "/cases";
}
