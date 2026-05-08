import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type CaseType } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter, log: ["error"] });

const defectTypes = [
  { code: "BROKEN", name: "Rozbité při doručení", category: "TRANSPORT", order: 10 },
  { code: "NOT_WORKING", name: "Nefunguje vůbec", category: "ELECTRICAL", order: 20 },
  { code: "INTERMITTENT", name: "Občas nefunguje", category: "ELECTRICAL", order: 30 },
  { code: "NOISE", name: "Hluk / vibrace", category: "MECHANICAL", order: 40 },
  { code: "WRONG_ITEM", name: "Dodán špatný produkt", category: "LOGISTICS", order: 50 },
  { code: "WRONG_SIZE", name: "Špatná velikost", category: "LOGISTICS", order: 60 },
  { code: "WRONG_COLOR", name: "Špatná barva", category: "LOGISTICS", order: 70 },
  { code: "MISSING_PART", name: "Chybí část / příslušenství", category: "LOGISTICS", order: 80 },
  { code: "MATERIAL_DEFECT", name: "Vada materiálu", category: "MANUFACTURING", order: 90 },
  { code: "WORKMANSHIP", name: "Vada zpracování", category: "MANUFACTURING", order: 100 },
  { code: "WEAR_PREMATURE", name: "Předčasné opotřebení", category: "MANUFACTURING", order: 110 },
  { code: "EXPIRED", name: "Prošlá expirace", category: "OTHER", order: 120 },
  { code: "NOT_AS_DESCRIBED", name: "Neodpovídá popisu", category: "OTHER", order: 130 },
  { code: "OTHER", name: "Jiné", category: "OTHER", order: 999 },
];

const emailTemplates: Array<{
  code: string;
  name: string;
  caseType: CaseType | null;
  subject: string;
  attachPdf: string | null;
  autoSend: boolean;
}> = [
  { code: "CASE_RECEIVED", name: "Potvrzení přijetí reklamace", caseType: "REKLAMACE", subject: "Přijali jsme vaši reklamaci {{caseNumber}}", attachPdf: "claim_protocol", autoSend: true },
  { code: "CASE_NEED_INFO", name: "Žádost o doplnění údajů", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – potřebujeme doplňující informace", attachPdf: null, autoSend: false },
  { code: "CASE_UNDER_REVIEW", name: "Reklamace v posuzování", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – aktuálně posuzujeme", attachPdf: null, autoSend: false },
  { code: "CASE_WITH_SUPPLIER", name: "Předáno dodavateli", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – předáno k posouzení dodavateli", attachPdf: null, autoSend: false },
  { code: "CASE_DECIDED_APPROVED", name: "Reklamace uznána", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – uznána", attachPdf: "resolution_protocol", autoSend: false },
  { code: "CASE_DECIDED_REJECTED", name: "Reklamace zamítnuta", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – zamítnuta", attachPdf: "resolution_protocol", autoSend: false },
  { code: "CASE_RESOLVED", name: "Reklamace vyřízena", caseType: "REKLAMACE", subject: "Reklamace {{caseNumber}} – vyřízeno", attachPdf: null, autoSend: false },
  { code: "WITHDRAWAL_RECEIVED", name: "Potvrzení odstoupení od smlouvy", caseType: "ODSTOUPENI", subject: "Přijali jsme vaše odstoupení od smlouvy {{caseNumber}}", attachPdf: "withdrawal_form", autoSend: true },
  { code: "WITHDRAWAL_GOODS_RECEIVED", name: "Zboží přijato zpět", caseType: "ODSTOUPENI", subject: "Odstoupení {{caseNumber}} – zboží jsme obdrželi", attachPdf: null, autoSend: false },
  { code: "WITHDRAWAL_REFUNDED", name: "Peníze odeslány", caseType: "ODSTOUPENI", subject: "Odstoupení {{caseNumber}} – peníze odeslány", attachPdf: null, autoSend: false },
  { code: "CUSTOMER_REMINDER", name: "Připomenutí zákazníkovi", caseType: null, subject: "Připomenutí: případ {{caseNumber}}", attachPdf: null, autoSend: false },
];

async function main() {
  console.log("Seeding...");

  for (const d of defectTypes) {
    await prisma.defectType.upsert({
      where: { code: d.code },
      update: { name: d.name, category: d.category, order: d.order },
      create: d,
    });
  }
  console.log(`  ✓ ${defectTypes.length} defect types`);

  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@firma.cz" },
    update: {},
    create: {
      email: "admin@firma.cz",
      name: "Administrátor",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("  ✓ admin user (admin@firma.cz / admin123)");

  await prisma.customer.upsert({
    where: { email: "demo.zakaznik@example.cz" },
    update: {},
    create: {
      email: "demo.zakaznik@example.cz",
      name: "Demo Zákazník",
      phone: "+420 777 123 456",
      street: "Ukázková 1",
      city: "Praha",
      zip: "110 00",
      country: "CZ",
      source: "MANUAL",
    },
  });
  console.log("  ✓ demo customer");

  for (const t of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        caseType: t.caseType,
        subject: t.subject,
        attachPdf: t.attachPdf,
        autoSend: t.autoSend,
      },
      create: {
        code: t.code,
        name: t.name,
        caseType: t.caseType,
        subject: t.subject,
        bodyHtml: "",
        bodyText: "",
        attachPdf: t.attachPdf,
        autoSend: t.autoSend,
      },
    });
  }
  console.log(`  ✓ ${emailTemplates.length} email templates (placeholder bodies)`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
