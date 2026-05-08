export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    // Fallback: comma-separated
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function stringifyTags(tags: string[] | undefined | null): string | null {
  if (!tags || tags.length === 0) return null;
  return JSON.stringify(tags);
}
