// TODO: Přesunout do databáze (Settings) v pozdější fázi.
// Hodnoty se vkládají do PDF protokolů.
export const COMPANY = {
  name: process.env.COMPANY_NAME ?? "Vaše firma s.r.o.",
  street: process.env.COMPANY_STREET ?? "Hlavní 1",
  city: process.env.COMPANY_CITY ?? "Praha",
  zip: process.env.COMPANY_ZIP ?? "110 00",
  country: process.env.COMPANY_COUNTRY ?? "Česká republika",
  ico: process.env.COMPANY_ICO ?? "12345678",
  dic: process.env.COMPANY_DIC ?? "CZ12345678",
  email: process.env.COMPANY_EMAIL ?? "reklamace@firma.cz",
  phone: process.env.COMPANY_PHONE ?? "+420 000 000 000",
  web: process.env.COMPANY_WEB ?? "www.firma.cz",
  registration:
    process.env.COMPANY_REGISTRATION ??
    "Společnost zapsaná v obchodním rejstříku, oddíl C, vložka 12345",
} as const;

export type Company = typeof COMPANY;
