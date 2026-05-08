import type { CaseStatus, CaseType } from "@/generated/prisma/client";

const TERMINAL: ReadonlyArray<CaseStatus> = ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED"];
const ESCAPE: ReadonlyArray<CaseStatus> = ["REJECTED", "CANCELLED"];

const REKLAMACE_TRANSITIONS: Record<CaseStatus, ReadonlyArray<CaseStatus>> = {
  NEW: ["UNDER_REVIEW", "WAITING_CUSTOMER", "WITH_SUPPLIER", "DECIDED", ...ESCAPE],
  UNDER_REVIEW: ["WAITING_CUSTOMER", "WITH_SUPPLIER", "DECIDED", ...ESCAPE],
  WAITING_CUSTOMER: ["UNDER_REVIEW", "WITH_SUPPLIER", "DECIDED", ...ESCAPE],
  WITH_SUPPLIER: ["UNDER_REVIEW", "DECIDED", ...ESCAPE],
  DECIDED: ["RESOLVED", ...ESCAPE],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
  // Odstoupení-only states — not used by REKLAMACE but enum requires complete map
  WAITING_RETURN: [],
  GOODS_RECEIVED: [],
  REFUND_PENDING: [],
};

const ODSTOUPENI_TRANSITIONS: Record<CaseStatus, ReadonlyArray<CaseStatus>> = {
  NEW: ["WAITING_RETURN", ...ESCAPE],
  WAITING_RETURN: ["GOODS_RECEIVED", ...ESCAPE],
  GOODS_RECEIVED: ["REFUND_PENDING", "WAITING_RETURN", ...ESCAPE],
  REFUND_PENDING: ["RESOLVED", ...ESCAPE],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
  // Reklamace-only states
  UNDER_REVIEW: [],
  WAITING_CUSTOMER: [],
  WITH_SUPPLIER: [],
  DECIDED: [],
};

export function allowedNextStatuses(type: CaseType, current: CaseStatus): ReadonlyArray<CaseStatus> {
  const map = type === "REKLAMACE" ? REKLAMACE_TRANSITIONS : ODSTOUPENI_TRANSITIONS;
  return map[current] ?? [];
}

export function canTransition(type: CaseType, from: CaseStatus, to: CaseStatus): boolean {
  return allowedNextStatuses(type, from).includes(to);
}

export function isTerminal(status: CaseStatus): boolean {
  return TERMINAL.includes(status);
}

const ALL_REKLAMACE_STATUSES: ReadonlyArray<CaseStatus> = [
  "NEW",
  "UNDER_REVIEW",
  "WAITING_CUSTOMER",
  "WITH_SUPPLIER",
  "DECIDED",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
];

const ALL_ODSTOUPENI_STATUSES: ReadonlyArray<CaseStatus> = [
  "NEW",
  "WAITING_RETURN",
  "GOODS_RECEIVED",
  "REFUND_PENDING",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
];

export function statusesForType(type: CaseType): ReadonlyArray<CaseStatus> {
  return type === "REKLAMACE" ? ALL_REKLAMACE_STATUSES : ALL_ODSTOUPENI_STATUSES;
}
