import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseTypeBadge } from "@/components/cases/case-type-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.order.findUnique({
    where: { id },
    select: { shoptetNumber: true },
  });
  return { title: o ? `${o.shoptetNumber} – Objednávka` : "Objednávka – Reklamace" };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { id: "asc" } },
      cases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          caseNumber: true,
          type: true,
          status: true,
          receivedAt: true,
        },
      },
    },
  });

  if (!order) notFound();

  const itemsTotal = order.items.reduce(
    (sum, it) => sum + Number(it.unitPrice) * it.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Objednávka · importováno ${formatDate(order.importedAt)}${order.status ? ` · ${order.status}` : ""}`}
        title={<span className="font-mono">{order.shoptetNumber}</span>}
        description={`Objednáno ${formatDate(order.orderDate)}`}
        back={
          <Button
            render={<Link href="/orders" aria-label="Zpět" />}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Položky ({order.items.length})</CardTitle>
              <span className="text-sm text-muted-foreground">
                Součet: {formatCurrency(itemsTotal, order.currency)}
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné položky.</p>
              ) : (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      {item.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div>{item.quantity} ks</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(Number(item.unitPrice), order.currency)} / ks
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      {formatCurrency(
                        Number(item.unitPrice) * item.quantity,
                        order.currency,
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Související případy ({order.cases.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.cases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  K této objednávce zatím není napojený žádný případ.
                </p>
              ) : (
                order.cases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{c.caseNumber}</span>
                      <CaseTypeBadge type={c.type} />
                      <CaseStatusBadge status={c.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Přijato {formatDate(c.receivedAt)}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zákazník</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Link
                href={`/customers/${order.customer.id}`}
                className="font-medium hover:underline inline-flex items-center gap-1"
              >
                {order.customer.name ?? order.customer.email}
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div className="text-muted-foreground">{order.customer.email}</div>
              {order.customer.phone && (
                <div className="text-muted-foreground">{order.customer.phone}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Souhrn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Celkem</span>
                <span className="font-medium">
                  {formatCurrency(Number(order.totalAmount), order.currency)}
                </span>
              </div>
              {order.paymentMethod && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platba</span>
                  <span>{order.paymentMethod}</span>
                </div>
              )}
              {order.shippingMethod && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Doprava</span>
                  <span>{order.shippingMethod}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
