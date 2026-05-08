import Papa from "papaparse";

import {
  normalizeHeader,
  parseCsvDate,
  parseCsvDecimal,
  parseCsvInt,
  pickFirst,
} from "./normalize";

export type OrderItemImportRow = {
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OrderImportRow = {
  rowIndex: number;
  shoptetNumber: string;
  customerEmail: string;
  orderDate: Date;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  shippingMethod?: string;
  status?: string;
  items: OrderItemImportRow[];
};

export type OrderImportError = {
  rowIndex: number;
  message: string;
};

export type OrderParseResult = {
  rows: OrderImportRow[];
  errors: OrderImportError[];
  totalLines: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseItemsJson(value: string | undefined): OrderItemImportRow[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const out: OrderItemImportRow[] = [];
    for (const it of parsed) {
      if (!it || typeof it !== "object") continue;
      const obj = it as Record<string, unknown>;
      const name = String(obj.name ?? obj.nazev ?? "").trim();
      if (!name) continue;
      const sku = obj.sku ? String(obj.sku).trim() : undefined;
      const qty = Number(obj.quantity ?? obj.qty ?? obj.mnozstvi ?? 1);
      const price = Number(obj.unitPrice ?? obj.price ?? obj.cena ?? 0);
      if (!Number.isFinite(qty) || qty < 1) continue;
      out.push({
        sku,
        name,
        quantity: qty,
        unitPrice: Number.isFinite(price) ? price : 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseOrdersCsv(text: string): OrderParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
    delimiter: "",
  });

  const rows: OrderImportRow[] = [];
  const errors: OrderImportError[] = [];

  parsed.data.forEach((rawRow, idx) => {
    const rowIndex = idx + 2;

    const shoptetNumber = pickFirst(
      rawRow,
      "cislo_objednavky",
      "objednavka",
      "order_number",
      "number",
    );
    if (!shoptetNumber) {
      errors.push({ rowIndex, message: "Chybí číslo objednávky." });
      return;
    }

    const customerEmail = pickFirst(
      rawRow,
      "email_zakaznika",
      "email",
      "zakaznik_email",
    )?.toLowerCase();
    if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
      errors.push({
        rowIndex,
        message: `Chybí nebo neplatný email zákazníka u objednávky ${shoptetNumber}.`,
      });
      return;
    }

    const orderDate = parseCsvDate(pickFirst(rawRow, "datum", "date", "datum_objednavky"));
    if (!orderDate) {
      errors.push({
        rowIndex,
        message: `Neplatné datum u objednávky ${shoptetNumber}.`,
      });
      return;
    }

    const totalAmount = parseCsvDecimal(
      pickFirst(rawRow, "celkem", "total", "castka", "cena_celkem"),
    );
    if (totalAmount === undefined) {
      errors.push({
        rowIndex,
        message: `Neplatná celková cena u objednávky ${shoptetNumber}.`,
      });
      return;
    }

    const items = parseItemsJson(pickFirst(rawRow, "polozky_json", "items"));

    rows.push({
      rowIndex,
      shoptetNumber,
      customerEmail,
      orderDate,
      totalAmount,
      currency: (pickFirst(rawRow, "mena", "currency") ?? "CZK").toUpperCase(),
      paymentMethod: pickFirst(rawRow, "zpusob_platby", "payment", "platba"),
      shippingMethod: pickFirst(rawRow, "zpusob_dopravy", "shipping", "doprava"),
      status: pickFirst(rawRow, "status", "stav"),
      items,
    });
  });

  return {
    rows,
    errors,
    totalLines: parsed.data.length,
  };
}

// Re-export for convenience
export { parseCsvInt };
