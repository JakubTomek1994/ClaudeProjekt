# Reklamační aplikace – Shrnutí projektu

## Co se buduje

Webová aplikace pro evidenci **reklamací** a **odstoupení od smlouvy** z e-shopu na platformě Shoptet. Cílem je nahradit současný chaos (Pohoda + emaily) přehledným systémem s automatizovanou emailovou komunikací, hlídáním lhůt a statistikami.

## Kontext

| | |
|---|---|
| E-shop | Shoptet |
| Účetnictví | Pohoda |
| Volume | ~50 případů měsíčně |
| Email | Microsoft 365 / Outlook na vlastní doméně |
| Vývoj | Claude Code |

## Klíčová rozhodnutí

- **Dva typy případů** v jedné aplikaci: Reklamace (`R-YYYY-NNN`) a Odstoupení od smlouvy (`O-YYYY-NNN`). Každý má vlastní workflow a lhůty.
- **Bez plné integrace** se Shoptetem/Pohodou. Místo toho periodický **CSV import** zákazníků a objednávek (cca 1× měsíčně).
- **Email přes Microsoft Graph API** – odesílání i příjem, automatické párování odpovědí na případ.
- **Trojvrstvé párování emailů**: `In-Reply-To` hlavička → tag `[R-YYYY-NNN]` v subjectu → plus addressing v reply-to.
- **Auto-zakládání draftů** z nepárovaných emailů – vy je pak doplníte a potvrdíte.
- **Push notifikace na telefon** přes ntfy.sh nebo Telegram bot.
- **Editace před odesláním** u všech důležitých emailů (rozhodnutí o reklamaci atd.).
- **PDF protokoly** se generují přímo z aplikace.

## Tech stack

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript
- **ORM**: Prisma
- **DB**: SQLite (start) → PostgreSQL (později)
- **UI**: Tailwind + shadcn/ui
- **Auth**: Auth.js (jednoduchý login pro vás a kolegy)
- **Email**: Microsoft Graph API (odchozí + příchozí + webhooks)
- **PDF**: react-pdf nebo Puppeteer
- **Push**: ntfy.sh / Telegram bot
- **Hostování**: VPS s Coolify (~200 Kč/měs) nebo Vercel + Supabase

## Funkční celky

1. **Evidence případů** – reklamace i odstoupení s vlastním workflow
2. **Email integrace** – odesílání + příjem + automatické párování
3. **Auto-zakládání případů** z příchozích emailů (draft → vy doplníte)
4. **Databáze zákazníků a objednávek** – organicky budovaná + CSV import
5. **Hlídání lhůt** – 30 dní (reklamace) / 14 dní (odstoupení), notifikace 7/3/0 dní před
6. **Šablony emailů** – 6–8 textů s placeholdery, vždy editovatelné
7. **PDF protokoly** – přijetí reklamace + vyřízení
8. **Statistiky** – produkty, dodavatelé, vady, doba vyřízení, finanční dopad

## Fáze vývoje

| Fáze | Obsah | Odhad |
|---|---|---|
| **1 – MVP** | Datový model, manuální zakládání, workflow, dashboard, hlídání lhůt, šablony pro manuální odeslání, PDF | 3–4 týdny |
| **2 – Email integrace** | Microsoft Graph, odchozí + příchozí, párování, auto-drafty, push notifikace | 1–2 týdny |
| **3 – Data a statistiky** | CSV import (zákazníci + objednávky), reporty, pokročilé filtry | 1–2 týdny |
| **4 – Vylepšení** | LLM extrakce, web formulář, mobilní vylepšení | průběžně |

## Co potřebujete předem připravit

1. **Microsoft 365 admin přístup** – pro registraci aplikace v Azure AD a oprávnění Mail.Send + Mail.Read
2. **Doménový email** – třeba `reklamace@firma.cz` (může být sdílená schránka v M365)
3. **Plus addressing** v M365 – jednorázově zapnout přes PowerShell: `Set-OrganizationConfig -AllowPlusAddressInRecipients $true`
4. **VPS nebo cloud účet** – pro hostování (Coolify na vlastním VPS, nebo Vercel + Supabase)
5. **ntfy.sh** nebo **Telegram bot** – pro push notifikace
6. **CSV export ze Shoptetu** – exportní funkce pro zákazníky a objednávky

## Co předat Claude Code

Druhý dokument (`REKLAMACNI_APP_SPEC.md`) je detailní specifikace, kterou předáte Claude Code spolu s instrukcí typu:

> *"Přečti si přiloženou specifikaci. Naimplementuj Fázi 1 (MVP) – datový model, základní UI, workflow pro oba typy případů, dashboard s hlídáním lhůt, generování PDF protokolů. Email integraci zatím vynech. Postupuj iterativně, po každém kroku ukaž co máš a počkej na potvrzení."*
