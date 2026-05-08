import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  History,
  ImageIcon,
  MessageSquare,
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCommunicationForm } from "@/components/cases/add-communication-form";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseTypeBadge } from "@/components/cases/case-type-badge";
import { DeadlinePill } from "@/components/cases/deadline-pill";
import { DeleteDocumentButton } from "@/components/cases/delete-document-button";
import { GeneratePdfMenu } from "@/components/cases/generate-pdf-menu";
import { StatusSelect } from "@/components/cases/status-select";
import { UploadDocumentForm } from "@/components/cases/upload-document-form";
import { formatFileSize, isImage } from "@/lib/storage/local";
import {
  CASE_ITEM_STATUS_LABELS,
  CASE_SOURCE_LABELS,
  CHANNEL_LABELS,
  DIRECTION_LABELS,
  DOCUMENT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
} from "@/lib/case/labels";
import { isTerminal } from "@/lib/case/workflow";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.case.findUnique({ where: { id }, select: { caseNumber: true } });
  return { title: c ? `${c.caseNumber} – Reklamace` : "Případ – Reklamace" };
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const caseDetail = await prisma.case.findUnique({
    where: { id },
    include: {
      customer: true,
      order: { include: { items: true } },
      assignee: { select: { name: true, email: true } },
      items: { orderBy: { id: "asc" } },
      communications: {
        orderBy: { occurredAt: "desc" },
        include: { author: { select: { name: true, email: true } } },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
      events: {
        orderBy: { occurredAt: "desc" },
        include: { author: { select: { name: true, email: true } } },
      },
    },
  });

  if (!caseDetail) notFound();

  const resolved = isTerminal(caseDetail.status);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              render={<Link href="/cases" aria-label="Zpět na seznam" />}
              variant="ghost"
              size="icon"
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-1.5">
              <p className="small-caps text-[10px] text-muted-foreground/85">
                Případ · {CASE_SOURCE_LABELS[caseDetail.source]} · přijato{" "}
                {formatDate(caseDetail.receivedAt)}
                {caseDetail.assignee &&
                  ` · řeší ${caseDetail.assignee.name ?? caseDetail.assignee.email}`}
              </p>
              <h1 className="font-mono text-3xl font-medium tracking-tight md:text-4xl">
                {caseDetail.caseNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <CaseTypeBadge type={caseDetail.type} />
                <CaseStatusBadge status={caseDetail.status} />
                {caseDetail.isDraft && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                    Draft
                  </span>
                )}
                <DeadlinePill deadline={caseDetail.deadlineAt} isResolved={resolved} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GeneratePdfMenu
              caseId={caseDetail.id}
              caseType={caseDetail.type}
              hasDecision={!!caseDetail.decidedAt}
              hasResolution={!!caseDetail.resolvedAt}
            />
            <StatusSelect
              caseId={caseDetail.id}
              type={caseDetail.type}
              currentStatus={caseDetail.status}
            />
          </div>
        </div>
        <div
          aria-hidden
          className="h-px w-full bg-gradient-to-r from-border via-border to-transparent"
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Přehled
            </TabsTrigger>
            <TabsTrigger value="communication">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Komunikace ({caseDetail.communications.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              Dokumenty ({caseDetail.documents.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-1.5 h-3.5 w-3.5" />
              Historie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {caseDetail.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Popis problému</CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">
                  {caseDetail.description}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Položky ({caseDetail.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseDetail.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné položky.</p>
                ) : (
                  caseDetail.items.map((item) => (
                    <div key={item.id} className="rounded-md border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          {item.productSku && (
                            <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div>{item.quantity} ks</div>
                          {item.unitPrice && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(Number(item.unitPrice))}
                            </div>
                          )}
                        </div>
                      </div>
                      {(item.defectType || item.defectDesc || item.supplier) && (
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          {item.defectType && (
                            <div>
                              <span className="font-medium">Vada:</span> {item.defectType}
                            </div>
                          )}
                          {item.supplier && (
                            <div>
                              <span className="font-medium">Dodavatel:</span> {item.supplier}
                            </div>
                          )}
                          {item.defectDesc && (
                            <div className="sm:col-span-2 whitespace-pre-wrap">
                              {item.defectDesc}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2 text-xs">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                          {CASE_ITEM_STATUS_LABELS[item.itemStatus]}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {caseDetail.internalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interní poznámka při založení</CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {caseDetail.internalNotes}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Přidat záznam</CardTitle>
              </CardHeader>
              <CardContent>
                <AddCommunicationForm caseId={caseDetail.id} />
              </CardContent>
            </Card>

            <div className="space-y-3">
              {caseDetail.communications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Žádné záznamy. Email integrace přijde ve Fázi 2.
                </p>
              ) : (
                caseDetail.communications.map((c) => {
                  const dirTone =
                    c.direction === "INTERNAL"
                      ? "border-l-muted-foreground/40 bg-muted/30"
                      : c.direction === "INCOMING"
                      ? "border-l-foreground/60 bg-card"
                      : "border-l-brand bg-card";
                  return (
                    <div
                      key={c.id}
                      className={`rounded-md border border-l-[3px] ${dirTone} p-4`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="small-caps text-muted-foreground">
                          {DIRECTION_LABELS[c.direction]} · {CHANNEL_LABELS[c.channel]}
                          {c.author ? ` · ${c.author.name ?? c.author.email}` : ""}
                        </span>
                        <span className="text-muted-foreground tabular">
                          {formatDateTime(c.occurredAt)}
                        </span>
                      </div>
                      {c.emailSubject && (
                        <div className="mt-2 text-sm font-medium">{c.emailSubject}</div>
                      )}
                      {c.noteText && (
                        <p className="mt-2 whitespace-pre-wrap text-sm">{c.noteText}</p>
                      )}
                      {c.emailText && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {c.emailText}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nahrát dokument</CardTitle>
              </CardHeader>
              <CardContent>
                <UploadDocumentForm caseId={caseDetail.id} />
              </CardContent>
            </Card>

            {caseDetail.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Žádné dokumenty. Nahrajte fotky vady, faktury, posudky, …
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {caseDetail.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-start gap-3 overflow-hidden rounded-md border bg-card p-3"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                      {isImage(doc.mimeType) ? (
                        <a
                          href={doc.storagePath}
                          target="_blank"
                          rel="noreferrer"
                          className="h-full w-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.storagePath}
                            alt={doc.filename}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <a
                        href={doc.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-medium hover:underline"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </a>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span className="small-caps">
                          {DOCUMENT_TYPE_LABELS[doc.type]}
                        </span>
                        <span>·</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>·</span>
                        <span>{formatDateTime(doc.uploadedAt)}</span>
                      </div>
                      {doc.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        render={
                          <a
                            href={doc.storagePath}
                            download={doc.filename}
                            aria-label="Stáhnout"
                          />
                        }
                        variant="ghost"
                        size="icon-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteDocumentButton
                        documentId={doc.id}
                        caseId={caseDetail.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {caseDetail.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné události.</p>
            ) : (
              <ol className="space-y-3 border-l pl-4">
                {caseDetail.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[20px] top-2 h-2 w-2 rounded-full bg-primary" />
                    <div className="text-sm font-medium">
                      {EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}
                      {e.fromValue && e.toValue && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {e.fromValue} → {e.toValue}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(e.occurredAt)}
                      {e.author && ` · ${e.author.name ?? e.author.email}`}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zákazník</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="font-medium">{caseDetail.customer.name ?? "—"}</div>
              <div className="text-muted-foreground">{caseDetail.customer.email}</div>
              {caseDetail.customer.phone && (
                <div className="text-muted-foreground">{caseDetail.customer.phone}</div>
              )}
              {caseDetail.customer.city && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs text-muted-foreground">
                    {[caseDetail.customer.street, caseDetail.customer.zip, caseDetail.customer.city]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {caseDetail.order && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objednávka</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-mono">{caseDetail.order.shoptetNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(caseDetail.order.orderDate)} ·{" "}
                  {formatCurrency(Number(caseDetail.order.totalAmount), caseDetail.order.currency)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lhůta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div>
                <span className="text-muted-foreground">Konec: </span>
                {formatDate(caseDetail.deadlineAt)}
              </div>
              {caseDetail.decidedAt && (
                <div>
                  <span className="text-muted-foreground">Rozhodnuto: </span>
                  {formatDate(caseDetail.decidedAt)}
                </div>
              )}
              {caseDetail.resolvedAt && (
                <div>
                  <span className="text-muted-foreground">Vyřízeno: </span>
                  {formatDate(caseDetail.resolvedAt)}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
