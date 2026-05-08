import Link from "next/link";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrdersFilters } from "@/components/orders/orders-filters";
import { PageHeader } from "@/components/page-header";
import type { Prisma } from "@/generated/prisma/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 30;

export const metadata = { title: "Objednávky – Reklamace" };

export default async function OrdersPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await props.searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { shoptetNumber: { contains: q } },
      { customer: { email: { contains: q } } },
      { customer: { name: { contains: q } } },
    ];
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ orderDate: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        shoptetNumber: true,
        orderDate: true,
        totalAmount: true,
        currency: true,
        status: true,
        customer: { select: { id: true, email: true, name: true } },
        _count: { select: { items: true, cases: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Objednávky"
        description={`Importované ze Shoptet exportu. Celkem ${total} ${total === 1 ? "objednávka" : total < 5 ? "objednávky" : "objednávek"}.`}
        actions={
          <Button render={<Link href="/import" />}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        }
      />

      <OrdersFilters initialQ={sp.q ?? ""} />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Číslo</TableHead>
              <TableHead className="w-[120px]">Datum</TableHead>
              <TableHead>Zákazník</TableHead>
              <TableHead className="w-[120px] text-right">Částka</TableHead>
              <TableHead className="w-[80px] text-right">Položek</TableHead>
              <TableHead className="w-[80px] text-right">Případů</TableHead>
              <TableHead className="w-[140px]">Stav (Shoptet)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  Žádné objednávky. Naimportujte CSV ze Shoptetu.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {o.shoptetNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(o.orderDate)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${o.customer.id}`}
                      className="text-sm hover:underline"
                    >
                      {o.customer.name ?? o.customer.email}
                    </Link>
                    {o.customer.name && (
                      <div className="text-xs text-muted-foreground">{o.customer.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(Number(o.totalAmount), o.currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {o._count.items}
                  </TableCell>
                  <TableCell className="text-right text-sm">{o._count.cases}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.status ?? "—"}
                  </TableCell>
                </TableRow>
              ))
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

function buildUrl(sp: { q?: string }, page: number): string {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/orders?${qs}` : "/orders";
}
