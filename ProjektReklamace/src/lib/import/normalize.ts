export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function pickFirst(
  row: Record<string, string | undefined>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

export function parseCsvBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "ano", "yes", "y", "ano/ne".split("/")[0]].includes(normalized);
}

export function parseCsvDecimal(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

export function parseCsvInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number.parseInt(value.replace(/\s/g, ""), 10);
  return Number.isFinite(num) ? num : undefined;
}

export function parseCsvDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // Try ISO first
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  // Czech format: d.M.yyyy or dd.MM.yyyy
  const cz = value.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (cz) {
    const [, d, m, y] = cz;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}
