import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomersFilters } from "@/components/customers/customers-filters";
import { PageHeader } from "@/components/page-header";
import type { CustomerSource, Prisma } from "@/generated/prisma/client";
import { CUSTOMER_SOURCE_LABELS } from "@/lib/case/labels";
import { parseTags } from "@/lib/case/tags";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 30;
const VALID_SOURCES: CustomerSource[] = ["MANUAL", "EMAIL", "CSV_IMPORT", "CASE_CREATION"];

export const metadata = { title: "Zákazníci – Reklamace" };

export default async function CustomersPage(props: {
  searchParams: Promise<{ source?: string; q?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const where: Prisma.CustomerWhereInput = {};
  if (sp.source && VALID_SOURCES.includes(sp.source as CustomerSource)) {
    where.source = sp.source as CustomerSource;
  }
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { phone: { contains: q } },
      { ico: { contains: q } },
    ];
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        city: true,
        isCompany: true,
        ico: true,
        source: true,
        tags: true,
        createdAt: true,
        _count: { select: { cases: true, orders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Zákazníci"
        description={`Databáze zákazníků. Celkem ${total} ${total === 1 ? "záznam" : total < 5 ? "záznamy" : "záznamů"}.`}
        actions={
          <>
            <Button render={<Link href="/import" />} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button render={<Link href="/customers/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              Nový zákazník
            </Button>
          </>
        }
      />

      <CustomersFilters initialSource={sp.source ?? ""} initialQ={sp.q ?? ""} />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Jméno / firma</TableHead>
              <TableHead className="w-[140px]">Telefon</TableHead>
              <TableHead className="w-[120px]">Město</TableHead>
              <TableHead className="w-[80px] text-right">Případy</TableHead>
              <TableHead className="w-[80px] text-right">Objednávky</TableHead>
              <TableHead className="w-[140px]">Zdroj</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  Žádní zákazníci. Začněte tlačítkem „Nový zákazník".
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => {
                const tags = parseTags(c.tags);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {c.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span>{c.name ?? "—"}</span>
                        {c.isCompany && c.ico && (
                          <span className="text-xs text-muted-foreground">
                            IČ {c.ico}
                          </span>
                        )}
                        {tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.city ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{c._count.cases}</TableCell>
                    <TableCell className="text-right text-sm">{c._count.orders}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {CUSTOMER_SOURCE_LABELS[c.source]}
                      <div className="text-[10px]">{formatDate(c.createdAt)}</div>
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
            <Button
              render={<Link href={buildUrl(sp, page - 1)} />}
              variant="outline"
              size="sm"
            >
              ← Předchozí
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Strana {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Button
              render={<Link href={buildUrl(sp, page + 1)} />}
              variant="outline"
              size="sm"
            >
              Další →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function buildUrl(sp: { source?: string; q?: string }, page: number): string {
  const params = new URLSearchParams();
  if (sp.source) params.set("source", sp.source);
  if (sp.q) params.set("q", sp.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/customers?${qs}` : "/customers";
}
