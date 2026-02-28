import type { Phase } from "@/lib/supabase/types";

export interface TemplateNode {
  label: string;
  description: string | null;
  phase: Phase;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  nodes: TemplateNode[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "empty",
    name: "Prázdný projekt",
    description: "Začněte s čistým plátnem.",
    nodes: [],
  },
  {
    id: "product-dev",
    name: "Vývoj produktu",
    description: "Šablona pro vývoj fyzického nebo digitálního produktu.",
    nodes: [
      { label: "Definice problému", description: "Jaký problém řešíme?", phase: "idea" },
      { label: "Průzkum trhu", description: "Analýza konkurence a cílové skupiny", phase: "research" },
      { label: "User personas", description: "Definice typických uživatelů", phase: "research" },
      { label: "Wireframes", description: "Drátěné modely klíčových obrazovek", phase: "design" },
      { label: "MVP specifikace", description: "Minimální životaschopný produkt", phase: "design" },
      { label: "Prototyp v1", description: "První funkční prototyp", phase: "prototype" },
      { label: "Uživatelské testování", description: "Testování s reálnými uživateli", phase: "testing" },
      { label: "Finální verze", description: "Produkční verze produktu", phase: "production" },
    ],
  },
  {
    id: "web-app",
    name: "Webová aplikace",
    description: "Šablona pro vývoj webové aplikace.",
    nodes: [
      { label: "Požadavky", description: "Sběr funkčních a nefunkčních požadavků", phase: "idea" },
      { label: "Tech stack", description: "Výběr technologií a frameworků", phase: "research" },
      { label: "Architektura", description: "Návrh architektury aplikace", phase: "design" },
      { label: "UI/UX návrh", description: "Design uživatelského rozhraní", phase: "design" },
      { label: "Backend API", description: "Implementace serverové logiky", phase: "prototype" },
      { label: "Frontend", description: "Implementace klientské části", phase: "prototype" },
      { label: "Integrace", description: "Propojení frontend + backend", phase: "testing" },
      { label: "QA testování", description: "Komplexní testování aplikace", phase: "testing" },
      { label: "Nasazení", description: "Deploy do produkce", phase: "production" },
    ],
  },
  {
    id: "marketing",
    name: "Marketingová kampaň",
    description: "Šablona pro plánování marketingové kampaně.",
    nodes: [
      { label: "Cíle kampaně", description: "Definice KPI a cílů", phase: "idea" },
      { label: "Cílová skupina", description: "Analýza publika a segmentace", phase: "research" },
      { label: "Konkurenční analýza", description: "Co dělá konkurence?", phase: "research" },
      { label: "Kreativní brief", description: "Vizuální a textový koncept", phase: "design" },
      { label: "Obsah a materiály", description: "Tvorba reklamních materiálů", phase: "prototype" },
      { label: "A/B testování", description: "Testování variant", phase: "testing" },
      { label: "Spuštění kampaně", description: "Launch a monitoring", phase: "production" },
      { label: "Vyhodnocení", description: "Analýza výsledků a ROI", phase: "done" },
    ],
  },
];
