import type { Phase } from "@/lib/supabase/types";

export interface PhaseConfig {
  id: Phase;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PHASES: PhaseConfig[] = [
  { id: "idea", label: "Napad", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { id: "research", label: "Pruzkum", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { id: "design", label: "Navrh", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { id: "prototype", label: "Prototyp", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { id: "testing", label: "Testovani", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { id: "production", label: "Vyroba", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  { id: "done", label: "Hotovo", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200" },
];

export const PHASE_MAP = new Map(PHASES.map((p) => [p.id, p]));

export const PHASE_COLUMN_WIDTH = 250;
export const PHASE_COLUMN_GAP = 20;
