# Pokračovat — Reklamační aplikace

> Continuation guide. Načti tenhle soubor na začátku další session a budeš mít kontext.

**Datum poslední session:** 2026-05-08
**Stav:** Fáze 1 (MVP) — Kroky **1.1 – 1.10 hotové**, MVP kompletní, dev server běží.

---

## Jak pokračovat — krok-za-krokem

```bash
cd C:\Users\Jakub\Desktop\ClaudeProjekt\ProjektReklamace
npm run dev
```

Otevři **http://localhost:3030** → login `admin@firma.cz` / `admin123`.

---

## Co je hotové (Kroky 1.1 – 1.8)

| # | Krok | Co umí |
|---|---|---|
| 1.1 | Setup | Next.js 16 + TS + Tailwind v4 + Prisma 7 + Auth.js v5 + shadcn/ui |
| 1.2 | Datový model | 13 modelů + 11 enumů; SQLite v `prisma/dev.db`; seed (14 vad, admin, 11 templates) |
| 1.3 | Auth + layout | Login (split editorial), proxy gate, dashboard layout, sidebar (5 skupin) + topbar + user menu |
| 1.4 | CRUD případů | `/cases` list + filtry, `/cases/new` (typ, zákazník inline, dynamické položky), `/cases/[id]` se 4 taby + status workflow |
| 1.5 | CRUD zákazníků | `/customers` list, create/edit (sdílený `CustomerForm`), historie případů + objednávek, štítky |
| 1.6 | Objednávky + CSV import | `/orders` list/detail, `/import` drag&drop pro Shoptet CSV (zákazníci + objednávky), papaparse |
| 1.7 | Komunikace + dokumenty | 4 channels v Komunikace tab (telefon/osobně/písemně/interní), upload dokumentů s 10 typy, thumbnaily, delete, audit log |
| 1.8 | PDF protokoly | 3 šablony (`@react-pdf/renderer` + Source Sans 3 TTF pro diakritiku), API route `/api/cases/[id]/pdf/[type]`, dropdown v case detail |
| 1.9 | Hlídání lhůt + notifikace | Cron `/api/cron/check-deadlines` (Vercel Cron 0 7 \* \* \* UTC), Notification bell s polling 60 s + mark-read, `<Toaster />` v root layoutu, Stagnující sekce v dashboardu, admin tlačítko Spustit kontrolu |
| 1.10 | Statistiky | `/stats` server page s filtrem (období + typ), KPI cards, top produkty / vady / dodavatelé, rozdělení rezolucí, finanční dopad, trend doby vyřízení po měsících. Inline `StatsBar` (žádný recharts) |

---

## Frontend redesign (po Kroku 1.6, na žádost uživatele)

Aplikoval skill `frontend-design` z anthropics/skills:
- **Brand fonty**: Exo 2 (display, geometrický sans pro nářadí/e-shop) + Source Sans 3 (body) + JetBrains Mono (čísla)
- **Brand paleta**: `#E1142E` (red akcent — urgence, REKLAMACE), `#292929` (foreground/CTAs), neutrální chladná šedá
- **Brand red rezervovaný pro urgenci** — overdue lhůty, REKLAMACE badge, sidebar active bar, login left panel highlight
- Login má cinematický split layout (deep slate bg + diagonální red gradient stripe + grid pattern)
- `PageHeader` komponenta sdílená napříč stránkami (eyebrow → display title → divider)

---

## Co dál — Fáze 2 (Email integrace)

Po dokončení 1.9 + 1.10 přijde **Microsoft Graph integrace**:
- Azure App Registration + client credentials flow
- Odchozí emaily z templates (engine + UI „Napsat zákazníkovi")
- Příchozí polling + trojvrstvé párování (In-Reply-To → tag v subjectu → plus addressing)
- Auto-zakládání draftů z nepárovaných emailů (nahradí `/cases/drafts` placeholder)
- Push notifikace (ntfy.sh / Telegram)

Detaily v `REKLAMACNI_APP_SPEC.md` sekce 5–6.

---

## Důležité technické pozn.

### Prisma 7 — driver adapter
Prisma 7 už nemá nativní engine — vyžaduje **driver adapter**:
```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
new PrismaClient({ adapter, log: ["error"] });
```
Pro Postgres (později) → `@prisma/adapter-pg`. Generated client je ve `src/generated/prisma/client.ts`, import ho **odtamtud** ne z `@prisma/client`.

### shadcn/ui s Base UI (ne Radix)
Aktuální shadcn registry instaluje komponenty s `@base-ui/react`. Místo `asChild` používá **`render` prop**:
```tsx
<Button render={<Link href="/foo" />}>Text</Button>          // ne asChild
<DropdownMenuTrigger render={<Button variant="ghost" />}>... // ne asChild
```
`Button` komponenta v `src/components/ui/button.tsx` má patch — automaticky vypne `nativeButton` když dostane `render` prop.

### Auth.js v5 + Czech labels
`src/types/next-auth.d.ts` augmentuje JWT v `@auth/core/jwt` (ne `next-auth/jwt` — to neaugmentuje správně). `AppRole` literal type, ne přímý import z Prismy (kvůli type resolution).

### Next.js 16 — `proxy.ts` ne `middleware.ts`
Middleware je deprecated. Soubor je v `src/proxy.ts`.

### PDF — Source Sans 3 TTF nutné
Defaultní Helvetica nemá českou diakritiku. TTF v `src/lib/pdf/fonts/`, registrace v `src/lib/pdf/fonts.ts:ensureFontsRegistered()`. Hyphenation disabled (default heuristika rozbíjí Czech).

### Storage cest
- `public/uploads/cases/{caseId}/{nanoid12}.{ext}` — sanitizovaná cesta
- Path traversal ochrana v `deleteStoredFile`
- Pro produkci na Vercelu nahradit za S3 (Vercel filesystem je read-only)

### Statistiky (Krok 1.10)
- `src/lib/stats/queries.ts` — server-only agregační helpery (`getStats(filter)`).
- `src/lib/stats/types.ts` — `StatsPeriod`, `STATS_PERIODS`, `PERIOD_LABEL` (čistě typy/konstanty bez Prisma importu, aby je bylo možné importovat do client komponenty bez bundlování `better-sqlite3` do prohlížeče — pozor na to při dalších stats změnách).
- Top produkty / vady / dodavatelé používají `findMany` + JS aggregaci (ne Prisma `groupBy`) — jednodušší než `where: { case: ... }` na CaseItem.
- Měsíční trend: `findMany` resolved cases + JS bucketing (Prisma `groupBy` na `strftime` roli SQLite není exposed).
- `defectType` je `code` z `DefectType` číselníku — label resolvujeme přes `defectType.findMany()` mapou.

### Cron + notifikace (Krok 1.9)
- **Schedule** v `vercel.json`: `0 7 * * *` UTC (= 8:00 zima / 9:00 léto v Praze). Pro přesné 8:00 v létě uprav na `0 6 * * *`.
- **Endpoint** `POST /api/cron/check-deadlines` (i `GET`) — autorizace `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron posílá hlavičku automaticky když je v projektu `CRON_SECRET` env.
- **Pure logika** v `src/lib/cron/check-deadlines.ts:runDeadlineCheck()` — `deadlineBucket()` rozhoduje 7D/3D/TODAY/PASSED, idempotentní (check existence by `caseId+type`).
- **Stagnující** = `updatedAt < now-5d`. Re-fire: jen pokud žádný `STAGNANT_CASE` neexistuje od posledního `CaseEvent`.
- **Fan-out** notifikací: pokud `assigneeId` → 1 záznam pro něj; jinak 1 záznam pro každého usera (broadcast). Notification model má jen `userId`/`caseId` (žádná Prisma relace `case` — case number načítáme zvlášť v API route).
- **Bell** (`src/components/notification-bell.tsx`) — polling 60 s + on-focus, mark-as-read na klik, navigace na `/cases/{id}`.
- **Push (ntfy.sh / Telegram)** — odsunuto do Fáze 2.

---

## Důležité ENV proměnné

```bash
# Auth
AUTH_SECRET="..."          # vygenerovaný node crypto
AUTH_TRUST_HOST=true       # žádný AUTH_URL pro dev

# Cron (Krok 1.9)
CRON_SECRET="..."          # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DB
DATABASE_URL="file:./prisma/dev.db"

# Firma (pro PDF protokoly) — volitelné, mají defaults
COMPANY_NAME="..."
COMPANY_ICO="..."
# atd.

# Fáze 2 (zatím prázdné)
MS_TENANT_ID=""
MS_CLIENT_ID=""
MS_CLIENT_SECRET=""
NTFY_TOPIC=""
```

---

## Užitečné npm scripty

```bash
npm run dev            # next dev -p 3030
npm run build          # production build
npm run db:migrate     # prisma migrate dev
npm run db:generate    # regenerate client
npm run db:seed        # rerun seed (idempotent upserts)
npm run db:studio      # GUI prohlížeč DB
npm run db:reset       # smaže DB + reset migrations + seed
```

---

## Sample data pro testování

`/sample-data/` obsahuje 2 CSV soubory:
- `zakaznici-sample.csv` — 4 zákazníci (3 osoby, 1 firma)
- `objednavky-sample.csv` — 4 objednávky napojené na ně

Naimportuj přes **`/import`** stránku.

---

## Známé limity / TODO

- **Sonner toast** — `<Toaster />` registrován v root layoutu (Krok 1.9), použitý v `RunCronButton`. Přidat i na ostatní actions (uložení změny zákazníka, upload dokumentu, atd.)
- **Settings stránka** — placeholder. Bude obsahovat: uživatele, šablony emailů, číselník vad, M365 connection.
- **GDPR** v customer detail — Export + Anonymizace tlačítka jsou disabled. Implementovat až bude potřeba.
- **Image preview** v dokumentech — momentálně klik otevře v novém tabu. Mohlo by být v lightboxu.
- **Drag&drop** v upload zónách — chová se jako native file input (pomocí `<label>`). Reálný drag&drop event handling chybí.
- **Prisma 7** je nový — jestli při dalším upgrade narazíš na breaking changes, zkontroluj generator output a adapter API.

---

## Co rozhodně **nedělat**

- **Neměň `prisma/schema.prisma` `provider = "prisma-client"`** — generuje TS soubory, ne JS modul. Pokud bys změnil na `prisma-client-js`, rozbije se import z `@/generated/prisma/client`.
- **Neinstaluj nový dev server bez killování starého** — dev visel na 3030 i po `npm run dev` nový — vždycky `netstat -ano | grep ":3030"` + `taskkill //PID X //F`.
- **Neměň `--font-sans` na `Inter`** — skill explicitně vyžaduje vyhnout se generic AI fontům. Source Sans 3 je distinct.

---

**Hodně štěstí v další session. 👍**
