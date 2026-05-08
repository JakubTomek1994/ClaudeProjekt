import { addDays, differenceInCalendarDays } from "date-fns";

import type { CaseType } from "@/generated/prisma/client";

export const DEADLINE_DAYS: Record<CaseType, number> = {
  REKLAMACE: 30,
  ODSTOUPENI: 14,
};

export function calculateDeadline(type: CaseType, receivedAt: Date): Date {
  return addDays(receivedAt, DEADLINE_DAYS[type]);
}

export type DeadlineUrgency = "passed" | "today" | "warning" | "soon" | "ok";

export function deadlineUrgency(deadline: Date, now: Date = new Date()): DeadlineUrgency {
  const days = differenceInCalendarDays(deadline, now);
  if (days < 0) return "passed";
  if (days === 0) return "today";
  if (days <= 3) return "warning";
  if (days <= 7) return "soon";
  return "ok";
}

export function daysToDeadline(deadline: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(deadline, now);
}
