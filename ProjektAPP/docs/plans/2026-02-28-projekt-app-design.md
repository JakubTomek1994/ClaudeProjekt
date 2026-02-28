# ProjektAPP — Aplikace na vedeni projektu a vyvoje vyrobku

## Prehled

Solo aplikace pro vedeni projektu od napadu po hotovy vyrobek. Kombinuje strukturovanou myslenkovou mapu s denikem projektu a podporou multimedi. Urcena pro mix fyzickych i softwarovych produktu.

## Architektura

- **Webova aplikace** — Next.js + TypeScript
- Pristup odkudkoli (i z telefonu na dilne)
- Moznost offline rezimu pres PWA

### Hlavni casti aplikace

1. **Dashboard** — prehled vsech projektu a jejich stav
2. **Myslenkova mapa** — interaktivni strukturovany editor s fazemi
3. **Denik projektu** — chronologicky zaznam s multimedii
4. **Detail projektu** — spojuje mapu + denik + metadata

## Faze vyrobku v mape

Napad → Pruzkum → Navrh → Prototyp → Testovani → Vyroba → Hotovo

Kazdy uzel v mape = zaznam, ke kteremu lze pripojit text, fotky, soubory a propojit ho s denikovym zapisem.

## Data flow a ukladani

### Databaze: PostgreSQL + Supabase

- **Projekty** — nazev, popis, stav, datum vytvoreni
- **Uzly mapy** — pozice, faze, nadrazeny uzel, spojnice na dalsi uzly
- **Zaznamy deniku** — datum, text, typ zmeny, dalsi krok, vazba na uzel mapy
- **Prilohy** — soubory/obrazky ulozene v Supabase Storage, navazane na zaznam

### Datovy tok

1. Uzivatel vytvori projekt → vznikne prazdna mapa s vychozimi fazemi
2. Prida uzel do faze → automaticky se vytvori denikovy zaznam
3. K uzlu pripoji poznamky, fotky, soubory → ulozi se jako prilohy zaznamu
4. Pri posunu uzlu do dalsi faze → automaticky zaznam v deniku s datem a duvodem

### Autentizace

Supabase Auth (email/heslo) — jednoduchy login pro solo pouziti, pripraveny na budouci sdileni.

## UI komponenty a myslenkova mapa

### Tech stack

| Oblast   | Volba                    |
| -------- | ------------------------ |
| Framework | Next.js + TypeScript    |
| Mapa     | React Flow               |
| UI       | Tailwind + shadcn/ui     |
| DB       | PostgreSQL (Supabase)    |
| Soubory  | Supabase Storage         |
| Auth     | Supabase Auth            |
| Testy    | Vitest + Testing Library + Playwright |

### Layout mapy

- Horizontalni sloupce = faze (Napad → Pruzkum → ... → Hotovo)
- Uzly se radi do sloupce podle sve faze
- Spojnice ukazuji zavislosti mezi uzly (napr. "nacrt → 3D model → prototyp")
- Barevne kodovani: kazda faze ma svou barvu

### Uzel mapy obsahuje

- Nazev
- Kratky popis (1-2 radky)
- Nahled posledni prilohy (fotka/ikona souboru)
- Indikator poctu denikovych zaznamu
- Klik → otevre detail s plnym denikem a prilohami

### Denik projektu

- Timeline pohled — zaznamy serazene chronologicky
- Kazdy zaznam: datum, typ zmeny, popis, dalsi krok, prilohy
- Filtr podle faze nebo uzlu
- Drag & drop upload fotek a souboru

## Error handling

- Autosave — zmeny se ukladaji automaticky po 2s necinnosti
- Offline indikator — pri vypadku spojeni zobrazi banner, zmeny se ulozi lokalne a synchronizuji po obnoveni
- Optimistic updates — UI reaguje okamzite, pri chybe se vrati zpet s notifikaci
- Upload souboru — progress bar, validace typu/velikosti pred odeslanim (max 20MB na soubor)

## Testovani

- **Unit testy (Vitest)** — utility funkce, datove transformace
- **Komponentove testy (Testing Library)** — formulare, denik, detail uzlu
- **E2E testy (Playwright)** — hlavni flow: vytvoreni projektu → pridani uzlu → upload souboru → posun do dalsi faze

## Klicove funkce (shruti)

1. Dashboard s prehledem projektu
2. Strukturovana myslenkova mapa s fazemi vyrobku
3. Denik projektu s multimedii a strukturovanymi zaznamy
4. Automaticke propojeni mapy ↔ denik
5. Autosave + offline podpora
