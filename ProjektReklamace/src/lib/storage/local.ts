import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const PUBLIC_ROOT = path.join(process.cwd(), "public");
export const UPLOADS_PUBLIC_PREFIX = "/uploads";
const UPLOADS_DIR = path.join(PUBLIC_ROOT, "uploads");

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
  storagePath: string; // public path under /uploads
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

  const caseDir = path.join(UPLOADS_DIR, "cases", caseId);
  await mkdir(caseDir, { recursive: true });

  const ext = sanitizeExtension(file.name);
  const storedFilename = `${nanoid(12)}${ext}`;
  const filePath = path.join(caseDir, storedFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const storagePath = `${UPLOADS_PUBLIC_PREFIX}/cases/${caseId}/${storedFilename}`;

  return {
    filename: file.name,
    storagePath,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  if (!storagePath.startsWith(`${UPLOADS_PUBLIC_PREFIX}/`)) {
    throw new Error("Neplatná cesta k souboru.");
  }
  const relative = storagePath.replace(`${UPLOADS_PUBLIC_PREFIX}/`, "");
  const fullPath = path.join(UPLOADS_DIR, relative);
  // Defense: ensure resolved path stays inside UPLOADS_DIR
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error("Path traversal detected.");
  }
  try {
    await unlink(resolved);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
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
