# Reklamační aplikace – Specifikace pro Claude Code

> **Tento dokument je technická specifikace. Předej ho Claude Code (vlož do promptu nebo do repozitáře jako `SPEC.md`) a postupuj podle sekce "Postup implementace" na konci.**

---

## 1. Účel a kontext

Webová aplikace pro evidenci **reklamací** a **odstoupení od smlouvy** z e-shopu (Shoptet). Nahrazuje současný chaotický proces v Pohodě + emailech.

**Cíle:**
- Žádný případ se neztratí
- Lhůty se hlídají automaticky
- Komunikace se zákazníkem je v jednom místě (deník případu)
- Statistiky pro vyhodnocení (problémoví dodavatelé, vadné produkty, doba vyřízení)
- Maximální automatizace email komunikace s editací před odesláním

**Volume:** ~50 případů měsíčně. Aplikaci budou používat 1–3 lidé z firmy.

**Žádné napojení** na Shoptet/Pohoda API. Data se přenášejí přes **CSV import** (zákazníci, objednávky) a **email** (komunikace se zákazníky).

---

## 2. Tech stack

```
Frontend/Backend  Next.js 15 (App Router) + TypeScript + React Server Components
ORM               Prisma
Databáze          SQLite (dev + start) → PostgreSQL (prod, později)
UI                Tailwind CSS + shadcn/ui (komponenty: Form, Table, Dialog, Tabs, Badge, ...)
Validace          Zod (formuláře, API)
Auth              Auth.js (Credentials provider, role-based)
Email             Microsoft Graph SDK (@microsoft/microsoft-graph-client)
PDF               react-pdf (preferováno) nebo Puppeteer
Push              ntfy.sh (zdarma, jednoduché) nebo Telegram Bot API
Cron              node-cron nebo platformní cron (Coolify, Vercel)
Hostování         VPS + Coolify (preferováno – self-hosted, cca 200 Kč/měs) nebo Vercel + Supabase Postgres
Soubory           Lokální FS (start) nebo S3-kompatibilní storage (později)
```

**Struktura projektu:**
```
/app                Next.js App Router (stránky, API routes)
  /(dashboard)      Hlavní rozhraní po přihlášení
  /api              REST API endpoints
  /auth             Login/logout
/components         React komponenty (shadcn/ui + custom)
/lib                Sdílená logika
  /email            Microsoft Graph integrace, párování, šablony
  /pdf              Generátory PDF
  /workflow         Stavové stroje pro reklamace/odstoupení
  /notifications    Cron joby a push notifikace
  /import           CSV parsování
/prisma             Schema + migrace
/templates          HTML šablony emailů a PDF
/public/uploads     Přílohy (fotky, dokumenty) – v dev; v prod použít storage
```

---

## 3. Datový model (Prisma schema)

Toto je **návrh** – Claude Code by měl rozšířit a upřesnit dle potřeby.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // později "postgresql"
  url      = env("DATABASE_URL")
}

// === Uživatelé aplikace (interní) ===
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // hash
  role      Role     @default(OPERATOR)
  createdAt DateTime @default(now())

  cases         Case[]         @relation("CaseAssignee")
  caseEvents    CaseEvent[]
  communications Communication[]
}

enum Role {
  ADMIN
  OPERATOR
}

// === Zákazníci ===
model Customer {
  id        String   @id @default(cuid())
  email     String   @unique // primární klíč pro párování
  name      String?
  phone     String?
  street    String?
  city      String?
  zip       String?
  country   String?  @default("CZ")
  ico       String?
  dic       String?
  isCompany Boolean  @default(false)
  notes     String?  // interní poznámky
  tags      String?  // JSON pole stringů: ["VIP", "problémový", ...]

  source    CustomerSource @default(MANUAL) // odkud přišel
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  cases  Case[]
  orders Order[]

  @@index([email])
}

enum CustomerSource {
  MANUAL
  EMAIL          // založen automaticky z příchozího emailu
  CSV_IMPORT     // ze Shoptet exportu
  CASE_CREATION  // při vytvoření případu
}

// === Objednávky (z CSV importu) ===
model Order {
  id            String   @id @default(cuid())
  shoptetNumber String   @unique // např. "20260412"
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])

  orderDate     DateTime
  totalAmount   Decimal
  currency      String   @default("CZK")
  paymentMethod String?
  shippingMethod String?
  status        String?  // ze Shoptetu

  items OrderItem[]
  cases Case[]

  importedAt DateTime @default(now())

  @@index([customerId])
  @@index([orderDate])
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])

  sku       String?
  name      String
  quantity  Int
  unitPrice Decimal

  caseItems CaseItem[]

  @@index([orderId])
}

// === Případy (reklamace + odstoupení) ===
model Case {
  id           String     @id @default(cuid())
  caseNumber   String     @unique // "R-2026-001" nebo "O-2026-001"
  type         CaseType
  status       CaseStatus
  isDraft      Boolean    @default(false) // čeká na zpracování operátorem

  // Vstupní kanál
  source       CaseSource

  // Datumy
  receivedAt   DateTime   // datum přijetí (lhůta běží od něj)
  deadlineAt   DateTime   // vypočítaná lhůta (30 dní pro R, 14 pro O)
  decidedAt    DateTime?  // kdy bylo rozhodnuto
  resolvedAt   DateTime?  // kdy uzavřeno

  // Vazby
  customerId   String
  customer     Customer   @relation(fields: [customerId], references: [id])
  orderId      String?
  order        Order?     @relation(fields: [orderId], references: [id])
  assigneeId   String?
  assignee     User?      @relation("CaseAssignee", fields: [assigneeId], references: [id])

  // Detaily
  description    String?  // úvodní popis problému (z emailu nebo formuláře)
  internalNotes  String?  // interní poznámky operátorů
  
  // Řešení
  resolution     Resolution?
  resolutionNote String?  // důvod (zejména u zamítnutí)
  refundAmount   Decimal? // vrácená částka
  refundedAt     DateTime?

  // Tagy
  tags         String?    // JSON ["vada dopravou", "výrobní vada", ...]

  // Vztahy
  items          CaseItem[]
  communications Communication[]
  documents      Document[]
  events         CaseEvent[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([caseNumber])
  @@index([status])
  @@index([deadlineAt])
  @@index([customerId])
  @@index([type, status])
}

enum CaseType {
  REKLAMACE       // R-YYYY-NNN
  ODSTOUPENI      // O-YYYY-NNN
}

enum CaseSource {
  EMAIL           // přišlo emailem
  WEB_FORM        // strukturovaný web formulář
  PHONE           // telefonicky, zapsáno operátorem
  IN_PERSON       // osobně
  MANUAL          // ručně založeno
}

enum CaseStatus {
  // Společné
  NEW                  // přijato, ale není rozpracováno
  
  // Reklamace specifické
  UNDER_REVIEW         // posuzuje se
  WITH_SUPPLIER        // předáno dodavateli/servisu
  WAITING_CUSTOMER     // čekáme na součinnost zákazníka
  DECIDED              // rozhodnuto
  
  // Odstoupení specifické
  WAITING_RETURN       // čekáme na zboží zpět
  GOODS_RECEIVED       // zboží přijato, kontroluje se
  REFUND_PENDING       // schváleno k vrácení peněz
  
  // Společné finální
  RESOLVED             // vyřízeno
  CLOSED               // uzavřeno (po lhůtě reklamace nebo finální)
  REJECTED             // zamítnuto
  CANCELLED            // zrušeno (zákazník stáhl, omyl, atd.)
}

enum Resolution {
  REPAIR              // oprava
  REPLACEMENT         // výměna
  DISCOUNT            // sleva
  REFUND              // vrácení peněz
  REJECTED            // zamítnuto
  PARTIAL             // částečně uznáno
}

// === Položky případu (jeden případ = více produktů) ===
model CaseItem {
  id          String    @id @default(cuid())
  caseId      String
  case        Case      @relation(fields: [caseId], references: [id], onDelete: Cascade)

  orderItemId String?
  orderItem   OrderItem? @relation(fields: [orderItemId], references: [id])

  productName String
  productSku  String?
  quantity    Int       @default(1)
  unitPrice   Decimal?
  
  defectType  String?   // číselník vad – viz seed
  defectDesc  String?   // detail problému
  supplier    String?   // dodavatel/výrobce – pro statistiky

  itemStatus  CaseItemStatus @default(PENDING)
  itemResolution Resolution?

  @@index([caseId])
}

enum CaseItemStatus {
  PENDING
  APPROVED
  REJECTED
  PARTIAL
}

// === Komunikace (deník případu) ===
model Communication {
  id        String     @id @default(cuid())
  caseId    String
  case      Case       @relation(fields: [caseId], references: [id], onDelete: Cascade)

  direction Direction
  channel   Channel
  
  // Email-specific
  emailMessageId String?  // hlavička Message-ID (pro párování)
  emailFrom      String?
  emailTo        String?
  emailSubject   String?
  emailHtml      String?  // tělo HTML
  emailText      String?  // tělo plain text
  
  // Manual entry
  authorId  String?
  author    User?      @relation(fields: [authorId], references: [id])
  noteText  String?    // ruční zápis (telefonát, osobní jednání)

  attachments Attachment[]

  isAutomated Boolean  @default(false) // automaticky odeslaný systémem
  templateUsed String? // identifikátor šablony

  occurredAt  DateTime
  createdAt   DateTime @default(now())

  @@index([caseId])
  @@index([emailMessageId])
}

enum Direction {
  INCOMING
  OUTGOING
  INTERNAL  // interní poznámka
}

enum Channel {
  EMAIL
  PHONE
  IN_PERSON
  WRITTEN
  WEB_FORM
  INTERNAL_NOTE
}

// === Dokumenty ===
model Document {
  id        String       @id @default(cuid())
  caseId    String
  case      Case         @relation(fields: [caseId], references: [id], onDelete: Cascade)

  type      DocumentType
  filename  String
  mimeType  String
  size      Int          // bytes
  storagePath String     // cesta v FS nebo S3 klíč

  uploadedBy String?
  uploadedAt DateTime    @default(now())
  notes      String?

  @@index([caseId])
}

enum DocumentType {
  PHOTO_DEFECT
  INVOICE
  DELIVERY_NOTE
  CLAIM_PROTOCOL       // reklamační protokol
  RESOLUTION_PROTOCOL  // protokol o vyřízení
  WITHDRAWAL_FORM      // formulář pro odstoupení
  SERVICE_REPORT       // posudek servisu
  CREDIT_NOTE          // dobropis
  SHIPPING_LABEL
  OTHER
}

// === Přílohy emailů a komunikací ===
model Attachment {
  id              String        @id @default(cuid())
  communicationId String
  communication   Communication @relation(fields: [communicationId], references: [id], onDelete: Cascade)

  filename    String
  mimeType    String
  size        Int
  storagePath String
  
  createdAt   DateTime @default(now())
  
  @@index([communicationId])
}

// === Audit log případu ===
model CaseEvent {
  id        String   @id @default(cuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)

  eventType String   // "STATUS_CHANGED", "ASSIGNED", "EMAIL_SENT", "DEADLINE_WARNING", ...
  fromValue String?
  toValue   String?
  
  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id])
  
  metadata  String?  // JSON s detaily
  occurredAt DateTime @default(now())

  @@index([caseId])
  @@index([eventType])
}

// === Číselníky ===
model DefectType {
  id    String  @id @default(cuid())
  code  String  @unique // "MOTOR_NOISE", "BROKEN", ...
  name  String  // "Hlučnost motoru"
  category String? // "MECHANICAL", "ELECTRICAL", ...
  active Boolean @default(true)
  order Int     @default(0)
}

model EmailTemplate {
  id          String   @id @default(cuid())
  code        String   @unique // "CASE_RECEIVED", "CASE_DECIDED_APPROVED", ...
  name        String
  caseType    CaseType?
  subject     String   // s placeholdery {{caseNumber}}, {{customerName}}...
  bodyHtml    String
  bodyText    String
  attachPdf   String?  // "claim_protocol", "resolution_protocol"
  autoSend    Boolean  @default(false) // true = posílá se bez kliknutí
  active      Boolean  @default(true)
  
  updatedAt   DateTime @updatedAt
}

// === Notifikace ===
model Notification {
  id        String   @id @default(cuid())
  userId    String?  // null = všichni
  caseId    String?

  type      NotificationType
  title     String
  message   String
  
  channel   String   // "IN_APP", "PUSH_NTFY", "PUSH_TELEGRAM", "EMAIL"
  
  readAt    DateTime?
  sentAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
}

enum NotificationType {
  DEADLINE_WARNING_7D
  DEADLINE_WARNING_3D
  DEADLINE_TODAY
  DEADLINE_PASSED
  STAGNANT_CASE          // dlouho beze změny
  NEW_CASE_DRAFT         // přišel nepárovaný email
  CUSTOMER_REPLIED       // přišla odpověď
  CASE_ASSIGNED
}

// === Email pairing fronta ===
model UnpairedEmail {
  id           String   @id @default(cuid())
  
  graphMessageId String @unique // ID z Microsoft Graph
  emailFrom    String
  emailSubject String
  emailDate    DateTime
  emailHtml    String?
  emailText    String?
  
  attempts     Int      @default(0)
  status       UnpairedStatus @default(PENDING)
  
  createdAt    DateTime @default(now())
  resolvedAt   DateTime?
  resolution   String?  // "PAIRED_TO_CASE_X", "CREATED_NEW_CASE_X", "NOT_RELEVANT"
}

enum UnpairedStatus {
  PENDING
  AUTO_PAIRED
  MANUAL_REVIEW
  IGNORED
}
```

**Poznámky k modelu:**

- `caseNumber` se generuje při vytvoření: prefix podle typu + rok + pořadí v roce
- `deadlineAt` se vypočítává v aplikační logice při vytvoření case (30 dní pro R, 14 pro O od `receivedAt`)
- `Customer.email` je primární klíč pro párování příchozích emailů
- `Communication.emailMessageId` je naprosto klíčové pro párování odpovědí
- `DefectType` má vlastní tabulku, ale `CaseItem.defectType` je string (kód) – flexibilní

---

## 4. Stavový workflow

### Reklamace (`R-YYYY-NNN`)
```
NEW
  ↓
UNDER_REVIEW   ←──→  WAITING_CUSTOMER  (potřebujeme součinnost)
  ↓
WITH_SUPPLIER  (předáno dodavateli/servisu)
  ↓
DECIDED        (rozhodnuto: uznáno / zamítnuto / částečně)
  ↓
RESOLVED       (vyřešeno – oprava/výměna/sleva/peníze)
  ↓
CLOSED
```
Z kteréhokoli stavu lze přejít do `REJECTED` nebo `CANCELLED`.

### Odstoupení od smlouvy (`O-YYYY-NNN`)
```
NEW
  ↓
WAITING_RETURN  (čekáme na zboží zpět)
  ↓
GOODS_RECEIVED  (zboží přijato, kontroluje se stav)
  ↓
REFUND_PENDING  (schváleno k vrácení peněz)
  ↓
RESOLVED        (peníze odeslány)
  ↓
CLOSED
```

**Pravidla přechodů:**
- Přechod stavu vždy loguj jako `CaseEvent` s `authorId`
- Při některých přechodech automaticky odeslat email (viz šablony)
- `RESOLVED` vyžaduje vyplnění `resolution` a `decidedAt`/`refundedAt`
- `REJECTED` vyžaduje povinné vyplnění `resolutionNote` (důvod)

---

## 5. Email integrace (Microsoft Graph)

### 5.1 Setup

1. **Azure App Registration** (Azure portal → Azure AD → App registrations → New)
   - Application type: Web
   - Redirect URI: `https://app.firma.cz/api/auth/microsoft/callback`
2. **API permissions** (Application permissions, ne Delegated):
   - `Mail.Send` – odesílání jako schránka
   - `Mail.ReadWrite` – čtení a označování přečteného
   - `Mail.ReadBasic` – základní metadata
3. **Client secret** – vygenerovat a uložit do `.env`
4. **Admin consent** – udělit oprávnění tenant-wide
5. **Plus addressing** – v M365 admin spustit:
   ```powershell
   Set-OrganizationConfig -AllowPlusAddressInRecipients $true
   ```

### 5.2 Konfigurace v aplikaci

`.env`:
```
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
MS_MAILBOX_USER=reklamace@firma.cz
MS_MAILBOX_REPLY_TO=reklamace@firma.cz
```

### 5.3 Odesílání emailu

```typescript
// /lib/email/sendEmail.ts
async function sendCaseEmail(caseId, templateCode, customData) {
  const case = await prisma.case.findUnique({ where: { id: caseId }, include: { customer: true } });
  const template = await prisma.emailTemplate.findUnique({ where: { code: templateCode } });
  
  const subject = renderTemplate(template.subject, { case, customer, ...customData });
  const body = renderTemplate(template.bodyHtml, { case, customer, ...customData });
  
  // Subject má vždy obsahovat tag pro párování
  const taggedSubject = `${subject} [${case.caseNumber}]`;
  
  // Reply-To s plus addressingem
  const replyTo = process.env.MS_MAILBOX_USER.replace('@', `+${case.caseNumber.replace(/-/g, '')}@`);
  // např. reklamace+R2026001@firma.cz
  
  // Volitelně přiložit PDF
  const attachments = [];
  if (template.attachPdf === 'claim_protocol') {
    attachments.push(await generateClaimProtocol(case));
  }
  
  const message = {
    subject: taggedSubject,
    body: { contentType: 'HTML', content: body },
    toRecipients: [{ emailAddress: { address: case.customer.email } }],
    replyTo: [{ emailAddress: { address: replyTo } }],
    attachments
  };
  
  // Pošli přes Graph
  const result = await graphClient
    .api(`/users/${process.env.MS_MAILBOX_USER}/sendMail`)
    .post({ message, saveToSentItems: true });
  
  // Ulož Message-ID pro párování (Graph ho vrací jinak – je potřeba získat ho z Sent Items)
  // alternativně si vygenerujeme vlastní Message-ID a vložíme do internetMessageHeaders
  
  await prisma.communication.create({
    data: {
      caseId,
      direction: 'OUTGOING',
      channel: 'EMAIL',
      emailMessageId: messageId,
      emailFrom: process.env.MS_MAILBOX_USER,
      emailTo: case.customer.email,
      emailSubject: taggedSubject,
      emailHtml: body,
      isAutomated: template.autoSend,
      templateUsed: templateCode,
      occurredAt: new Date(),
      // attachments...
    }
  });
}
```

### 5.4 Příjem emailů – párování (KRITICKÁ ČÁST)

**Strategie:** Polling každých 5 minut nebo Graph subscription (webhook) na `/users/.../mailFolders/inbox/messages`.

**Párovací kaskáda** (postupně, první match vyhrává):

```typescript
async function pairIncomingEmail(graphMessage) {
  // Převeď Graph message na náš formát
  const email = {
    messageId: graphMessage.internetMessageId,
    inReplyTo: extractHeader(graphMessage, 'In-Reply-To'),
    references: extractHeader(graphMessage, 'References'),
    subject: graphMessage.subject,
    from: graphMessage.from.emailAddress.address,
    to: graphMessage.toRecipients.map(r => r.emailAddress.address),
    body: graphMessage.body.content,
    receivedAt: new Date(graphMessage.receivedDateTime),
    attachments: graphMessage.attachments
  };
  
  // KROK 1: In-Reply-To header (nejspolehlivější)
  if (email.inReplyTo) {
    const existing = await prisma.communication.findFirst({
      where: { emailMessageId: email.inReplyTo }
    });
    if (existing) return appendToCase(existing.caseId, email);
  }
  
  // KROK 1b: References (pokud je to vlákno vícenásobné)
  if (email.references) {
    const refIds = email.references.split(/\s+/);
    for (const refId of refIds) {
      const existing = await prisma.communication.findFirst({
        where: { emailMessageId: refId }
      });
      if (existing) return appendToCase(existing.caseId, email);
    }
  }
  
  // KROK 2: Tag v subjectu [R-2026-001] nebo [O-2026-042]
  const subjectMatch = email.subject.match(/\[([RO])-(\d{4})-(\d+)\]/);
  if (subjectMatch) {
    const caseNumber = `${subjectMatch[1]}-${subjectMatch[2]}-${subjectMatch[3]}`;
    const existing = await prisma.case.findUnique({ where: { caseNumber } });
    if (existing) return appendToCase(existing.id, email);
  }
  
  // KROK 3: Plus addressing v To/Reply-To
  for (const toAddr of email.to) {
    const plusMatch = toAddr.match(/\+([RO])(\d{4})(\d+)@/);
    if (plusMatch) {
      const caseNumber = `${plusMatch[1]}-${plusMatch[2]}-${plusMatch[3]}`;
      const existing = await prisma.case.findUnique({ where: { caseNumber } });
      if (existing) return appendToCase(existing.id, email);
    }
  }
  
  // KROK 4: Auto-vytvoření draftu nebo fronta
  return handleUnpairedEmail(email);
}
```

### 5.5 Auto-zakládání případů z nepárovaných emailů

```typescript
async function handleUnpairedEmail(email) {
  // Zjisti, jestli to vůbec vypadá na reklamaci/odstoupení
  const looksLikeCase = checkRelevanceKeywords(email);
  // Pokud ne → ulož do UnpairedEmail s MANUAL_REVIEW
  
  if (!looksLikeCase) {
    return await prisma.unpairedEmail.create({ ... });
  }
  
  // Najdi nebo vytvoř zákazníka
  let customer = await prisma.customer.findUnique({ where: { email: email.from } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: email.from,
        name: extractNameFromEmail(graphMessage.from), // jméno z From hlavičky
        source: 'EMAIL'
      }
    });
  }
  
  // Detekuj typ (heuristika nebo později LLM)
  const type = detectCaseType(email); // REKLAMACE | ODSTOUPENI | unknown
  
  // Vytvoř draft
  const caseNumber = await generateCaseNumber(type);
  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      type,
      status: 'NEW',
      isDraft: true,
      source: 'EMAIL',
      receivedAt: email.receivedAt,
      deadlineAt: calculateDeadline(type, email.receivedAt),
      customerId: customer.id,
      description: stripHtml(email.body)
    }
  });
  
  // Přidej email jako první komunikaci
  await prisma.communication.create({ ... });
  
  // Ulož přílohy
  for (const att of email.attachments) {
    await saveAttachment(newCase.id, att);
  }
  
  // Notifikace
  await pushNotification({
    type: 'NEW_CASE_DRAFT',
    title: `Nový případ ${caseNumber} – čeká na zpracování`,
    message: `Od ${customer.email}: ${email.subject.substring(0, 80)}`
  });
  
  return newCase;
}
```

**Klíčové slovní detekce typu:**
- REKLAMACE: "reklamace", "reklamuji", "vada", "vadné", "rozbité", "nefunguje", "nefunkční", "kazí se", "v záruce", "závada", "porouchá"
- ODSTOUPENI: "odstoupení od smlouvy", "odstupuji", "vrácení do 14 dní", "vrátit zboží", "zrušit objednávku", "nechci zboží", "vrácení peněz"
- Pokud nelze rozhodnout → default REKLAMACE + flag `needsTypeReview`

### 5.6 Detekce auto-replies a spamu

Před zpracováním kontroluj:
- Hlavička `Auto-Submitted: auto-replied` → ignoruj
- Hlavička `X-Auto-Response-Suppress` → ignoruj
- `Precedence: bulk` nebo `list` → ignoruj
- Email od `noreply@`, `mailer-daemon@`, `postmaster@` → ignoruj

---

## 6. Generování Message-ID a párovací mechanismus

Microsoft Graph při odesílání generuje Message-ID sám. Aby šlo párovat odpovědi, musíme po odeslání:
1. Buď načíst odeslaný email z Sent Items a získat `internetMessageId`
2. Nebo do `internetMessageHeaders` při odesílání vložit vlastní `Message-ID` (Graph to umožňuje)

Doporučená cesta: **vlastní Message-ID**:
```typescript
const ourMessageId = `<${case.caseNumber}-${Date.now()}-${nanoid(8)}@firma.cz>`;
const message = {
  ...,
  internetMessageHeaders: [
    { name: 'Message-ID', value: ourMessageId }  // Graph ho použije
  ]
};
// Ulož ourMessageId do Communication.emailMessageId
```

---

## 7. CSV import (Shoptet)

### 7.1 Zákazníci

Endpoint: `POST /api/import/customers`

Vstup: CSV soubor s hlavičkou. Sloupce dle Shoptet exportu (lze upravit mapping):
```
email, jmeno, prijmeni, telefon, ulice, mesto, psc, ico, dic, firma_je_plnce_dph, ...
```

Logika:
- Každý řádek → upsert na `Customer.email`
- Pokud `email` je prázdný → přeskočit s logem
- `source = CSV_IMPORT`
- Při update **nepřepisuj** ručně zadané `notes` a `tags`
- Vrať report: `{ created: N, updated: M, skipped: K, errors: [...] }`

### 7.2 Objednávky

Endpoint: `POST /api/import/orders`

CSV sloupce:
```
cislo_objednavky, email_zakaznika, datum, celkem, mena, zpusob_platby, zpusob_dopravy, status, polozky_json
```

Logika:
- Najdi/vytvoř `Customer` podle emailu (pokud chybí)
- Upsert na `Order.shoptetNumber`
- Vytvoř `OrderItem` z položek
- Při re-importu existující objednávky **přepiš** položky

UI: jednoduchý drag&drop upload, progress bar, závěrečný report.

---

## 8. Šablony emailů

Implementuj engine s placeholdery `{{variable}}`. Dostupné proměnné:
```
{{caseNumber}}, {{caseType}} ("reklamace" | "odstoupení od smlouvy"),
{{customerName}}, {{customerEmail}},
{{deadlineDays}}, {{deadlineDate}},
{{productList}} (formátovaný seznam položek),
{{orderNumber}}, {{orderDate}},
{{resolution}}, {{resolutionNote}}, {{refundAmount}},
{{operatorName}}
```

### Seznam šablon (seed)

| Code | Účel | Trigger | Auto-send |
|---|---|---|---|
| `CASE_RECEIVED` | Potvrzení přijetí + protokol PDF | vytvoření case | ✅ ano |
| `CASE_NEED_INFO` | Žádost o doplnění údajů | manuální klik | ❌ ne |
| `CASE_UNDER_REVIEW` | Posuzujeme | manuálně | ❌ ne |
| `CASE_WITH_SUPPLIER` | Předáno dodavateli/servisu | změna stavu | ❌ ne |
| `CASE_DECIDED_APPROVED` | Reklamace uznána + protokol PDF | změna stavu DECIDED+APPROVED | ❌ ne (kontrola) |
| `CASE_DECIDED_REJECTED` | Reklamace zamítnuta + protokol PDF | změna stavu DECIDED+REJECTED | ❌ ne (kontrola) |
| `CASE_RESOLVED` | Vyřízeno | změna stavu RESOLVED | ❌ ne |
| `WITHDRAWAL_RECEIVED` | Potvrzení odstoupení | vytvoření odstoupení | ✅ ano |
| `WITHDRAWAL_GOODS_RECEIVED` | Zboží jsme dostali | změna stavu GOODS_RECEIVED | ❌ ne |
| `WITHDRAWAL_REFUNDED` | Peníze odeslány | refundedAt vyplněno | ❌ ne |
| `CUSTOMER_REMINDER` | Připomenutí (zákazník nereaguje 7 dní) | cron | ❌ ne |

**Poznámka:** Texty šablon vytvoříme společně v další fázi. V seed datech zatím prázdné placeholder texty + příznaky.

---

## 9. PDF protokoly

### Reklamační protokol (přijetí)
- Hlavička: logo, údaje firmy
- Číslo reklamace, datum přijetí
- Údaje o zákazníkovi
- Údaje o objednávce
- Reklamované položky + popis vady
- Lhůta vyřízení
- Poučení dle § 2099-2117 a § 1820 obč. zák.
- Místo pro podpisy

### Protokol o vyřízení
- Číslo reklamace, datum vyřízení
- Způsob vyřízení (oprava/výměna/sleva/zamítnutí)
- Důvod (zejména u zamítnutí)
- Finanční vypořádání

### Formulář pro odstoupení od smlouvy
- Standardní formulář dle vzoru z příl. č. 1 nař. vlády č. 363/2013 Sb.

**Implementace:** `react-pdf` s šablonami v `/templates/pdf/`. Generuj on-the-fly, ulož kopii do `Document` při finalizaci.

---

## 10. Notifikace a hlídání lhůt

### Cron joby (1× denně, ráno v 8:00)

```typescript
// /lib/notifications/dailyJob.ts

// 1. Lhůty
const cases = await prisma.case.findMany({
  where: {
    status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED'] },
    deadlineAt: { not: null }
  }
});

for (const c of cases) {
  const daysToDeadline = differenceInDays(c.deadlineAt, new Date());
  if (daysToDeadline === 7) await notify('DEADLINE_WARNING_7D', c);
  else if (daysToDeadline === 3) await notify('DEADLINE_WARNING_3D', c);
  else if (daysToDeadline === 0) await notify('DEADLINE_TODAY', c);
  else if (daysToDeadline < 0) await notify('DEADLINE_PASSED', c);
}

// 2. Stagnující případy (žádný event 5+ dní)
const stagnant = await prisma.case.findMany({
  where: {
    status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED'] },
    events: { none: { occurredAt: { gte: subDays(new Date(), 5) } } }
  }
});
// notify pro každý

// 3. Zákazník nereaguje 7+ dní (jsme v WAITING_CUSTOMER)
// ...
```

### Push notifikace

**ntfy.sh** (preferováno – zdarma, jednoduché):
```typescript
await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
  method: 'POST',
  body: 'Reklamace R-2026-005 – zítra končí lhůta',
  headers: {
    'Title': 'Hlídání lhůty',
    'Priority': 'high',
    'Tags': 'warning'
  }
});
```

Uživatel si nainstaluje ntfy aplikaci na telefon a přihlásí se k topicu.

**Telegram** (alternativa):
```typescript
await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
  method: 'POST',
  body: JSON.stringify({ chat_id: CHAT_ID, text: '...' })
});
```

### V aplikaci (in-app)

Bell ikona vpravo nahoře s počtem nepřečtených. Klik → seznam → klik na notifikaci → otevře případ.

---

## 11. UI – klíčové obrazovky

### Dashboard (`/`)
- Karty: počet aktivních R, aktivních O, drafty, blížící se lhůty, po lhůtě
- Sekce "Vyžaduje pozornost": drafty + případy s blížící se lhůtou + stagnující
- Graf: případy za posledních 30 dní

### Seznam případů (`/cases`)
- Tabulka s filtrováním (typ, stav, datum, lhůta, zákazník)
- Sloupce: číslo, typ, stav, zákazník, produkt, přijato, lhůta (s barvou), assignee, akce
- Quick actions: změnit stav, převzít, otevřít detail

### Detail případu (`/cases/[id]`)
- Hlavička: číslo, typ, stav, badge "Draft"/"Po lhůtě", lhůta s odpočtem
- Tabs:
  - **Přehled** – základní data, položky, řešení, tagy
  - **Komunikace** – chronologický deník (emaily, poznámky, telefonáty), tlačítko *"Napsat zákazníkovi"* (otevře šablonu k editaci) a *"Přidat poznámku"*
  - **Dokumenty** – upload, generování PDF protokolů
  - **Historie** – audit log z `CaseEvent`
- Postranní panel: zákazník (s historií jeho případů), objednávka (z importu)
- Akce: změnit stav, převzít, sloučit s jiným případem

### Nový případ (`/cases/new`)
- Wizard: typ → zákazník (search/create) → objednávka (search) → položky + vada → uložit

### Drafty / nepárované (`/cases/drafts`)
- Seznam draftů z emailů
- Tlačítka: zpracovat (otevře wizard s předvyplněnými údaji), sloučit s případem, zahodit

### Zákazníci (`/customers`)
- Tabulka, search, detail s historií případů a objednávek
- Tlačítka: import CSV, ručně přidat

### Statistiky (`/stats`)
- Filtr období
- Reporty: top reklamované produkty, dodavatelé, vady, doba vyřízení, finanční dopad, % uznaných

### Nastavení (`/settings`)
- Uživatelé a role
- Šablony emailů (editor)
- Číselník vad
- Microsoft 365 connection (status, test send)
- Notifikace (kanály)

---

## 12. Číselník vad (seed)

```typescript
const defectTypes = [
  { code: 'BROKEN', name: 'Rozbité při doručení', category: 'TRANSPORT' },
  { code: 'NOT_WORKING', name: 'Nefunguje vůbec', category: 'ELECTRICAL' },
  { code: 'INTERMITTENT', name: 'Občas nefunguje', category: 'ELECTRICAL' },
  { code: 'NOISE', name: 'Hluk / vibrace', category: 'MECHANICAL' },
  { code: 'WRONG_ITEM', name: 'Dodán špatný produkt', category: 'LOGISTICS' },
  { code: 'WRONG_SIZE', name: 'Špatná velikost', category: 'LOGISTICS' },
  { code: 'WRONG_COLOR', name: 'Špatná barva', category: 'LOGISTICS' },
  { code: 'MISSING_PART', name: 'Chybí část / příslušenství', category: 'LOGISTICS' },
  { code: 'MATERIAL_DEFECT', name: 'Vada materiálu', category: 'MANUFACTURING' },
  { code: 'WORKMANSHIP', name: 'Vada zpracování', category: 'MANUFACTURING' },
  { code: 'WEAR_PREMATURE', name: 'Předčasné opotřebení', category: 'MANUFACTURING' },
  { code: 'EXPIRED', name: 'Prošlá expirace', category: 'OTHER' },
  { code: 'NOT_AS_DESCRIBED', name: 'Neodpovídá popisu', category: 'OTHER' },
  { code: 'OTHER', name: 'Jiné', category: 'OTHER' }
];
```

---

## 13. Generování čísel případů

```typescript
async function generateCaseNumber(type: CaseType): Promise<string> {
  const prefix = type === 'REKLAMACE' ? 'R' : 'O';
  const year = new Date().getFullYear();
  
  // Najdi poslední v roce a typu
  const last = await prisma.case.findFirst({
    where: {
      type,
      caseNumber: { startsWith: `${prefix}-${year}-` }
    },
    orderBy: { caseNumber: 'desc' }
  });
  
  let nextSeq = 1;
  if (last) {
    const lastSeq = parseInt(last.caseNumber.split('-')[2]);
    nextSeq = lastSeq + 1;
  }
  
  return `${prefix}-${year}-${String(nextSeq).padStart(3, '0')}`;
}
```

---

## 14. Postup implementace (pro Claude Code)

**Doporučujeme stavět iterativně po fázích, po každé počkat na review uživatele.**

### Fáze 1 – MVP (bez emailové integrace)

**Krok 1.1: Setup projektu**
- `npx create-next-app@latest reklamace --typescript --tailwind --app`
- Přidat Prisma, Auth.js, shadcn/ui, Zod
- Inicializovat Prisma s SQLite
- Vytvořit `.env` šablonu

**Krok 1.2: Datový model**
- Vytvořit `prisma/schema.prisma` dle sekce 3
- Vygenerovat migraci
- Vytvořit seed: defekty + 1 admin user + ukázkový zákazník + ukázkové šablony

**Krok 1.3: Auth a layout**
- Auth.js Credentials provider
- Login stránka
- Hlavní layout: sidebar s navigací, top bar s notifikacemi a userem

**Krok 1.4: CRUD případů (manuální)**
- Seznam případů s filtry
- Wizard pro nový případ
- Detail s taby (Přehled, Komunikace, Dokumenty, Historie)
- Stavový workflow s validací přechodů
- Generování `caseNumber`

**Krok 1.5: Zákazníci**
- CRUD, search, detail s historií případů

**Krok 1.6: Objednávky a CSV import**
- Tabulka, detail
- Upload CSV, parser, upsert logika, report

**Krok 1.7: Komunikace (manuální zápis)**
- Přidat poznámku, telefonát, osobní jednání do deníku
- Upload příloh

**Krok 1.8: PDF protokoly**
- React-pdf šablony
- Generování + uložení do `Document`
- Stažení z UI

**Krok 1.9: Dashboard a hlídání lhůt**
- Karty s metrikami
- Cron job (node-cron) na denní kontrolu
- In-app notifikace (bell)

**Krok 1.10: Statistiky (basic)**
- Top produkty, vady, dodavatelé
- Filtr období

**👉 Zde STOP a uživateli ukázat, otestovat, doladit UX.**

### Fáze 2 – Email integrace

**Krok 2.1: Microsoft Graph setup**
- Implementovat OAuth client credentials flow
- Test endpoint: poslat testovací email

**Krok 2.2: Odchozí emaily**
- Engine šablon s placeholdery
- UI: tlačítko *"Napsat zákazníkovi"* → výběr šablony → editor → odeslat
- Vlastní `Message-ID` přes `internetMessageHeaders`
- Auto-send pro `CASE_RECEIVED`

**Krok 2.3: Příjem emailů (polling)**
- Cron každých 5 minut: `GET /users/{user}/mailFolders/inbox/messages?$filter=isRead eq false`
- Pro každý email: detekce auto-reply → párovací kaskáda
- Označit jako přečtený po zpracování

**Krok 2.4: Auto-zakládání draftů**
- `handleUnpairedEmail` logika
- UI: stránka `/cases/drafts` s frontou ke zpracování
- Tlačítka: zpracovat, sloučit, zahodit

**Krok 2.5: Push notifikace**
- ntfy.sh nebo Telegram setup
- Notifikace: nové drafty, blížící se lhůty, odpověď zákazníka

**👉 Zde STOP a otestovat email flow end-to-end.**

### Fáze 3 – Polish

- Rozšířené statistiky
- Šablony – konkrétní texty (vytvoříme spolu)
- Mobile responsive
- Performance, indexy
- Backup strategie

### Fáze 4 – Volitelná vylepšení

- LLM extrakce dat z příchozích emailů (Anthropic API)
- Strukturovaný web formulář pro zákazníky
- Webhook subscription místo pollingu
- Sloučení duplicitních případů s AI návrhem
- Plné napojení na Pohodu (XML mServer)

---

## 15. Klíčové instrukce pro Claude Code

Když budeš implementovat tuto specifikaci:

1. **Pracuj iterativně.** Nedělej všechno najednou. Implementuj jeden krok, ukaž výsledek, počkej na zpětnou vazbu.
2. **Drž se tech stacku.** Next.js + Prisma + shadcn/ui. Neimprovizuj alternativami bez ptaní.
3. **Validace všude.** Zod schémata pro vstupy do API i formulářů.
4. **Audit trail.** Každá změna stavu, každý odeslaný email, každý import → záznam v `CaseEvent`.
5. **Defenzivní párování.** Trojvrstvá kaskáda, čtvrtá vrstva manuální fronta. Žádný email se neztratí.
6. **Žádné "magic" automaty.** Každý odchozí email u rozhodnutí (uznáno/zamítnuto) **VYŽADUJE** kontrolu před odesláním. Auto-send je jen u potvrzení přijetí.
7. **České texty v UI.** Všechny labely, hlášky a šablony jsou česky.
8. **Datumy a časy** – pracuj v UTC v DB, zobrazuj v Europe/Prague. Použij `date-fns` s českou lokalizací.
9. **Typovost.** Žádné `any`. Prisma generuje typy, používej je.
10. **Testy** pro klíčovou logiku: párování emailů, výpočet lhůt, generování `caseNumber`.

---

## 16. Bezpečnost

- Hesla hash bcrypt
- Microsoft secrets v `.env`, **nikdy v repu**
- Validace na všech endpointech (Zod)
- Rate limiting na login
- HTTPS pouze (ochrana přes Coolify/Caddy)
- Backup DB denně (Coolify má built-in)
- GDPR: zákazník má právo na výpis a smazání – přidat funkci "Exportovat data zákazníka" a "Anonymizovat zákazníka"

---

## 17. Pojďte se mnou pracovat takto

> **Otevři Claude Code v prázdném repozitáři.**
> 
> První prompt:
> ```
> Přiloženou specifikaci si pečlivě přečti. Začni Fází 1, Krokem 1.1
> (setup projektu). Vytvoř základ Next.js aplikace dle stacku, Prisma
> schema dle sekce 3, jednoduchý layout. Po dokončení Kroku 1.1 počkej
> na moje potvrzení, než půjdeš na 1.2.
> ```
> 
> Po každém kroku otestujte, dejte feedback, jděte na další.

---

*Tato specifikace je živý dokument. Doplňujte si během vývoje poznámky, otevřené otázky a změny rozhodnutí.*
