import Papa from "papaparse";

import {
  normalizeHeader,
  parseCsvBoolean,
  pickFirst,
} from "./normalize";

export type CustomerImportRow = {
  rowIndex: number;
  email: string;
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  ico?: string;
  dic?: string;
  isCompany: boolean;
};

export type CustomerImportError = {
  rowIndex: number;
  message: string;
};

export type CustomerParseResult = {
  rows: CustomerImportRow[];
  errors: CustomerImportError[];
  totalLines: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCustomersCsv(text: string): CustomerParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
    delimiter: "",
  });

  const rows: CustomerImportRow[] = [];
  const errors: CustomerImportError[] = [];

  parsed.data.forEach((rawRow, idx) => {
    const rowIndex = idx + 2; // +1 for header, +1 for 1-based

    const email = pickFirst(rawRow, "email", "e_mail")?.toLowerCase();
    if (!email) {
      errors.push({ rowIndex, message: "Chybí sloupec email." });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      errors.push({ rowIndex, message: `Neplatný email: ${email}` });
      return;
    }

    const jmeno = pickFirst(rawRow, "jmeno", "first_name") ?? "";
    const prijmeni = pickFirst(rawRow, "prijmeni", "last_name") ?? "";
    const nazevFirmy = pickFirst(rawRow, "nazev_firmy", "firma", "company", "spolecnost");
    const directName = pickFirst(rawRow, "name", "jmeno_a_prijmeni", "celejmeno");

    const composedName = `${jmeno} ${prijmeni}`.trim();
    const name = directName || nazevFirmy || (composedName ? composedName : undefined);

    const isCompany =
      parseCsvBoolean(pickFirst(rawRow, "firma_je_plnce_dph", "je_firma", "company")) ||
      Boolean(nazevFirmy);

    rows.push({
      rowIndex,
      email,
      name,
      phone: pickFirst(rawRow, "telefon", "phone", "mobil"),
      street: pickFirst(rawRow, "ulice", "ulice_cp", "street"),
      city: pickFirst(rawRow, "mesto", "city"),
      zip: pickFirst(rawRow, "psc", "zip", "postcode"),
      country: pickFirst(rawRow, "zeme", "country") ?? "CZ",
      ico: pickFirst(rawRow, "ico", "ic"),
      dic: pickFirst(rawRow, "dic", "vat"),
      isCompany,
    });
  });

  return {
    rows,
    errors,
    totalLines: parsed.data.length,
  };
}
