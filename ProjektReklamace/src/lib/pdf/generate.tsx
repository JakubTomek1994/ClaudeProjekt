import { renderToBuffer } from "@react-pdf/renderer";

import type { CaseType, Resolution } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { ClaimProtocol } from "./claim-protocol";
import { ensureFontsRegistered } from "./fonts";
import { ResolutionProtocol } from "./resolution-protocol";
import { WithdrawalForm } from "./withdrawal-form";

export type PdfDocType =
  | "claim_protocol"
  | "resolution_protocol"
  | "withdrawal_form";

export const PDF_DOC_LABELS: Record<PdfDocType, string> = {
  claim_protocol: "Reklamační protokol",
  resolution_protocol: "Protokol o vyřízení",
  withdrawal_form: "Formulář pro odstoupení",
};

export const PDF_DOC_FILENAME_PREFIX: Record<PdfDocType, string> = {
  claim_protocol: "Reklamacni_protokol",
  resolution_protocol: "Protokol_o_vyrizeni",
  withdrawal_form: "Odstoupeni_od_smlouvy",
};

export class PdfNotApplicable extends Error {}

export async function generateCasePdf(
  caseId: string,
  type: PdfDocType,
): Promise<{ buffer: Buffer; filename: string }> {
  ensureFontsRegistered();

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      customer: true,
      order: true,
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!c) throw new Error("Případ nenalezen.");

  const filename = `${PDF_DOC_FILENAME_PREFIX[type]}_${c.caseNumber}.pdf`;

  if (type === "claim_protocol") {
    if (c.type !== "REKLAMACE") {
      throw new PdfNotApplicable(
        "Reklamační protokol lze vystavit pouze pro reklamace.",
      );
    }
    const buffer = await renderToBuffer(
      <ClaimProtocol
        data={{
          caseNumber: c.caseNumber,
          receivedAt: c.receivedAt,
          deadlineAt: c.deadlineAt,
          source: c.source,
          description: c.description,
          customer: c.customer,
          order: c.order
            ? {
                shoptetNumber: c.order.shoptetNumber,
                orderDate: c.order.orderDate,
                totalAmount: Number(c.order.totalAmount),
                currency: c.order.currency,
              }
            : null,
          items: c.items.map((it) => ({
            productName: it.productName,
            productSku: it.productSku,
            quantity: it.quantity,
            defectType: it.defectType,
            defectDesc: it.defectDesc,
            supplier: it.supplier,
          })),
        }}
      />,
    );
    return { buffer, filename };
  }

  if (type === "resolution_protocol") {
    if (!c.decidedAt && !c.resolvedAt) {
      throw new PdfNotApplicable(
        "Protokol o vyřízení lze vystavit až po rozhodnutí nebo vyřízení případu.",
      );
    }
    const buffer = await renderToBuffer(
      <ResolutionProtocol
        data={{
          caseNumber: c.caseNumber,
          type: c.type as CaseType,
          receivedAt: c.receivedAt,
          decidedAt: c.decidedAt,
          resolvedAt: c.resolvedAt,
          resolution: (c.resolution ?? null) as Resolution | null,
          resolutionNote: c.resolutionNote,
          refundAmount: c.refundAmount ? Number(c.refundAmount) : null,
          refundedAt: c.refundedAt,
          customer: c.customer,
          items: c.items.map((it) => ({
            productName: it.productName,
            productSku: it.productSku,
            quantity: it.quantity,
            defectType: it.defectType,
          })),
        }}
      />,
    );
    return { buffer, filename };
  }

  if (type === "withdrawal_form") {
    if (c.type !== "ODSTOUPENI") {
      throw new PdfNotApplicable(
        "Formulář pro odstoupení lze vystavit pouze pro případy odstoupení od smlouvy.",
      );
    }
    const buffer = await renderToBuffer(
      <WithdrawalForm
        data={{
          caseNumber: c.caseNumber,
          receivedAt: c.receivedAt,
          customer: c.customer,
          order: c.order
            ? {
                shoptetNumber: c.order.shoptetNumber,
                orderDate: c.order.orderDate,
              }
            : null,
          items: c.items.map((it) => ({
            productName: it.productName,
            productSku: it.productSku,
            quantity: it.quantity,
          })),
        }}
      />,
    );
    return { buffer, filename };
  }

  throw new PdfNotApplicable("Neznámý typ dokumentu.");
}
