import type { Phase, TaskStatus, Priority, EdgeType } from "@/lib/supabase/types";

export interface PhaseConfig {
  id: Phase;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PHASES: PhaseConfig[] = [
  { id: "idea", label: "Nápad", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { id: "research", label: "Průzkum", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { id: "design", label: "Návrh", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { id: "prototype", label: "Prototyp", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { id: "testing", label: "Testování", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { id: "production", label: "Výroba", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  { id: "done", label: "Hotovo", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200" },
];

export const PHASE_MAP = new Map(PHASES.map((p) => [p.id, p]));

export const PHASE_COLUMN_WIDTH = 250;
export const PHASE_COLUMN_GAP = 20;

export interface TaskStatusConfig {
  id: TaskStatus;
  label: string;
  color: string;
  bgColor: string;
}

export const TASK_STATUSES: TaskStatusConfig[] = [
  { id: "open", label: "Otevřený", color: "text-blue-700", bgColor: "bg-blue-100" },
  { id: "in_progress", label: "Rozpracovaný", color: "text-orange-700", bgColor: "bg-orange-100" },
  { id: "done", label: "Hotový", color: "text-green-700", bgColor: "bg-green-100" },
];

export const TASK_STATUS_MAP = new Map(TASK_STATUSES.map((s) => [s.id, s]));

export interface PriorityConfig {
  id: Priority;
  label: string;
  color: string;
  bgColor: string;
}

export const PRIORITIES: PriorityConfig[] = [
  { id: "low", label: "Nízká", color: "text-gray-700", bgColor: "bg-gray-100" },
  { id: "medium", label: "Střední", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  { id: "high", label: "Vysoká", color: "text-red-700", bgColor: "bg-red-100" },
];

export const PRIORITY_MAP = new Map(PRIORITIES.map((p) => [p.id, p]));

export interface EdgeTypeConfig {
  id: EdgeType;
  label: string;
  description: string;
  color: string;
  strokeDasharray?: string;
  markerEnd: boolean;
}

export const EDGE_TYPES: EdgeTypeConfig[] = [
  {
    id: "blocks",
    label: "Blokuje",
    description: "Cílový uzel nemůže pokračovat, dokud zdrojový není hotový",
    color: "#ef4444",
    markerEnd: true,
  },
  {
    id: "relates_to",
    label: "Souvisí s",
    description: "Uzly spolu souvisejí, ale neblokují se",
    color: "#6b7280",
    strokeDasharray: "5 5",
    markerEnd: false,
  },
  {
    id: "is_part_of",
    label: "Je součástí",
    description: "Zdrojový uzel je podčástí cílového",
    color: "#3b82f6",
    markerEnd: true,
  },
];

export const EDGE_TYPE_MAP = new Map(EDGE_TYPES.map((e) => [e.id, e]));

export interface DeadlineStatus {
  label: string;
  color: string;
  isOverdue: boolean;
}

export function getDeadlineStatus(deadline: string | null): DeadlineStatus | null {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline + "T00:00:00");
  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = deadlineDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });

  if (diffDays < 0) {
    return { label: `${formatted} (po termínu)`, color: "text-red-600", isOverdue: true };
  }
  if (diffDays === 0) {
    return { label: `${formatted} (dnes)`, color: "text-red-600", isOverdue: true };
  }
  if (diffDays <= 3) {
    return { label: formatted, color: "text-orange-600", isOverdue: false };
  }
  return { label: formatted, color: "text-green-600", isOverdue: false };
}
