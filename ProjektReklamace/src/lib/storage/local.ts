// Vercel Blob storage. Path naming kept (`local.ts`) for backwards-compat
// with existing imports — file no longer touches the local filesystem.
import { del, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import path from "node:path";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function sanitizeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ext || ext.length > 8) return "";
  return ext.replace(/[^.a-z0-9]/g, "");
}

export type SavedFile = {
  filename: string;
  storagePath: string; // Vercel Blob URL (https://...public.blob.vercel-storage.com/...)
  mimeType: string;
  size: number;
};

export async function saveCaseFile(caseId: string, file: File): Promise<SavedFile> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(
      `Nepodporovaný typ souboru: ${file.type || "neznámý"}. Povoleno: obrázky, PDF, Word, Excel, txt.`,
    );
  }
  if (file.size === 0) {
    throw new Error("Prázdný soubor.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Soubor je větší než ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  }

  const ext = sanitizeExtension(file.name);
  const blobPath = `cases/${caseId}/${nanoid(12)}${ext}`;

  const blob = await put(blobPath, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });

  return {
    filename: file.name,
    storagePath: blob.url,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await del(storagePath);
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "BlobNotFoundError") return;
    throw e;
  }
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
