"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveCaseFile } from "@/lib/storage/local";
import { DeleteDocumentSchema, UploadDocumentSchema } from "@/lib/zod/document";

export type UploadDocumentState =
  | { ok: true; uploaded: number }
  | { ok: false; error: string }
  | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nepřihlášený uživatel.");
  }
  return session.user;
}

export async function uploadDocument(
  _prev: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const user = await requireUser();

  const parsed = UploadDocumentSchema.safeParse({
    caseId: formData.get("caseId"),
    type: formData.get("type"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Zkontrolujte vyplněné údaje." };
  }

  const { caseId, type, notes } = parsed.data;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { ok: false, error: "Nahrajte alespoň jeden soubor." };
  }

  let saved = 0;
  for (const file of files) {
    try {
      const stored = await saveCaseFile(caseId, file);
      await prisma.document.create({
        data: {
          caseId,
          type,
          filename: stored.filename,
          mimeType: stored.mimeType,
          size: stored.size,
          storagePath: stored.storagePath,
          uploadedBy: user.id,
          notes: notes ?? null,
        },
      });
      await prisma.caseEvent.create({
        data: {
          caseId,
          eventType: "DOCUMENT_UPLOADED",
          authorId: user.id,
          metadata: JSON.stringify({ type, filename: stored.filename }),
        },
      });
      saved++;
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Chyba při nahrávání souboru.",
      };
    }
  }

  revalidatePath(`/cases/${caseId}`);
  return { ok: true, uploaded: saved };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = DeleteDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    caseId: formData.get("caseId"),
  });
  if (!parsed.success) {
    throw new Error("Neplatné parametry.");
  }

  const doc = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    select: { id: true, caseId: true, storagePath: true, filename: true, uploadedBy: true },
  });
  if (!doc || doc.caseId !== parsed.data.caseId) {
    throw new Error("Dokument neexistuje.");
  }

  // Authorization: uploader or admin
  if (user.role !== "ADMIN" && doc.uploadedBy !== user.id) {
    throw new Error("Nemáte oprávnění smazat tento dokument.");
  }

  await prisma.document.delete({ where: { id: doc.id } });
  await deleteStoredFile(doc.storagePath);

  await prisma.caseEvent.create({
    data: {
      caseId: doc.caseId,
      eventType: "DOCUMENT_DELETED",
      authorId: user.id,
      metadata: JSON.stringify({ filename: doc.filename }),
    },
  });

  revalidatePath(`/cases/${doc.caseId}`);
}
