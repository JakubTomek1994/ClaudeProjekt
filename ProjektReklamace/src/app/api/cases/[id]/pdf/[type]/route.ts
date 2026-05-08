import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateCasePdf,
  PdfNotApplicable,
  type PdfDocType,
} from "@/lib/pdf/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: PdfDocType[] = [
  "claim_protocol",
  "resolution_protocol",
  "withdrawal_form",
];

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; type: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { id, type } = await context.params;
  if (!VALID_TYPES.includes(type as PdfDocType)) {
    return NextResponse.json({ error: "Neplatný typ dokumentu." }, { status: 400 });
  }

  try {
    const { buffer, filename } = await generateCasePdf(id, type as PdfDocType);

    await prisma.caseEvent.create({
      data: {
        caseId: id,
        eventType: "PDF_GENERATED",
        authorId: session.user.id,
        metadata: JSON.stringify({ type, filename }),
      },
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PdfNotApplicable) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[pdf]", e);
    return NextResponse.json(
      { error: "Chyba při generování PDF." },
      { status: 500 },
    );
  }
}
