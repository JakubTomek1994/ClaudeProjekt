import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerForm } from "@/components/customers/customer-form";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseTypeBadge } from "@/components/cases/case-type-badge";
import { DeadlinePill } from "@/components/cases/deadline-pill";
import { PageHeader } from "@/components/page-header";
import { CUSTOMER_SOURCE_LABELS } from "@/lib/case/labels";
import { isTerminal } from "@/lib/case/workflow";
import { parseTags } from "@/lib/case/tags";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, select: { email: true } });
  return { title: c ? `${c.email} – Zákazník` : "Zákazník – Reklamace" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      cases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          caseNumber: true,
          type: true,
          status: true,
          receivedAt: true,
          deadlineAt: true,
        },
      },
      orders: {
        orderBy: { orderDate: "desc" },
        select: {
          id: true,
          shoptetNumber: true,
          orderDate: true,
          totalAmount: true,
          currency: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!customer) notFound();

  const tags = parseTags(customer.tags);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Zákazník · ${CUSTOMER_SOURCE_LABELS[customer.source]} · ${formatDate(customer.createdAt)}`}
        title={
          <span className="flex flex-wrap items-baseline gap-3">
            <span>{customer.name ?? customer.email}</span>
            {customer.isCompany && (
              <Badge variant="secondary" className="font-sans text-xs">
                Firma
              </Badge>
            )}
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-sans text-xs">
                {t}
              </Badge>
            ))}
          </span>
        }
        description={customer.email}
        back={
          <Button
            render={<Link href="/customers" aria-label="Zpět" />}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <CustomerForm
          mode="edit"
          initial={{
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            street: customer.street,
            city: customer.city,
            zip: customer.zip,
            country: customer.country,
            ico: customer.ico,
            dic: customer.dic,
            isCompany: customer.isCompany,
            notes: customer.notes,
            tags,
          }}
        />

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Případy ({customer.cases.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.cases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zákazník zatím nemá žádný případ.
                </p>
              ) : (
                customer.cases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block rounded-md border p-2 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{c.caseNumber}</span>
                      <CaseTypeBadge type={c.type} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <CaseStatusBadge status={c.status} />
                      <DeadlinePill
                        deadline={c.deadlineAt}
                        isResolved={isTerminal(c.status)}
                        showDate={false}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Přijato {formatDate(c.receivedAt)}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Objednávky ({customer.orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím žádné objednávky. Doplníme přes CSV import (Krok 1.6).
                </p>
              ) : (
                customer.orders.map((o) => (
                  <div key={o.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{o.shoptetNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(o.orderDate)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{o._count.items} položek</span>
                      <span>{formatCurrency(Number(o.totalAmount), o.currency)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">GDPR</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Export dat zákazníka a anonymizace dle čl. 15 a 17 GDPR. Přijde v Kroku 3 / Fáze
                vylepšení.
              </p>
              <Button variant="outline" size="sm" disabled>
                Exportovat data
              </Button>
              <Button variant="outline" size="sm" disabled className="ml-2">
                Anonymizovat
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
