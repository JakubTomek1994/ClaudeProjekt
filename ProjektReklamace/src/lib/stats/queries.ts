import { differenceInCalendarDays, startOfYear, subDays } from "date-fns";

import type { CaseType, Prisma, Resolution } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { STATS_PERIODS, type StatsPeriod } from "@/lib/stats/types";

export { STATS_PERIODS, PERIOD_LABEL, type StatsPeriod } from "@/lib/stats/types";

export type StatsFilter = {
  period: StatsPeriod;
  type: CaseType | null;
};

export function parseFilter(sp: { period?: string; type?: string }): StatsFilter {
  const period: StatsPeriod = STATS_PERIODS.includes(sp.period as StatsPeriod)
    ? (sp.period as StatsPeriod)
    : "90d";
  const type: CaseType | null =
    sp.type === "REKLAMACE" || sp.type === "ODSTOUPENI"
      ? (sp.type as CaseType)
      : null;
  return { period, type };
}

function periodRange(period: StatsPeriod, now: Date = new Date()): { from: Date | null; to: Date } {
  switch (period) {
    case "30d":
      return { from: subDays(now, 30), to: now };
    case "90d":
      return { from: subDays(now, 90), to: now };
    case "year":
      return { from: startOfYear(now), to: now };
    case "all":
      return { from: null, to: now };
  }
}

function caseWhere(filter: StatsFilter): Prisma.CaseWhereInput {
  const { from, to } = periodRange(filter.period);
  const where: Prisma.CaseWhereInput = { isDraft: false };
  if (filter.type) where.type = filter.type;
  if (from) where.receivedAt = { gte: from, lte: to };
  return where;
}

const APPROVED_RESOLUTIONS: ReadonlyArray<Resolution> = [
  "REPAIR",
  "REPLACEMENT",
  "DISCOUNT",
  "REFUND",
  "PARTIAL",
];

export type StatsKpis = {
  totalCases: number;
  decidedCases: number;
  approvedCases: number;
  rejectedCases: number;
  approvedPct: number | null;
  rejectedPct: number | null;
  avgResolutionDays: number | null;
};

export type RankRow = { label: string; count: number };
export type ResolutionRow = { resolution: Resolution; count: number; pct: number };
export type RefundBreakdown = {
  total: number;
  byType: Record<CaseType, number>;
};
export type MonthlyResolution = { month: string; count: number; avgDays: number };

export type StatsBundle = {
  filter: StatsFilter;
  kpis: StatsKpis;
  topProducts: RankRow[];
  topDefects: RankRow[];
  topSuppliers: RankRow[];
  resolutionBreakdown: ResolutionRow[];
  refunds: RefundBreakdown;
  monthly: MonthlyResolution[];
};

const EMPTY_REFUND_BY_TYPE: Record<CaseType, number> = {
  REKLAMACE: 0,
  ODSTOUPENI: 0,
};

async function getDefectLabelMap(): Promise<Map<string, string>> {
  const rows = await prisma.defectType.findMany({
    select: { code: true, name: true },
  });
  return new Map(rows.map((r) => [r.code, r.name]));
}

async function getKpis(where: Prisma.CaseWhereInput): Promise<StatsKpis> {
  const [totalCases, approvedCases, rejectedCases, decidedCases, resolved] =
    await Promise.all([
      prisma.case.count({ where }),
      prisma.case.count({
        where: { ...where, resolution: { in: [...APPROVED_RESOLUTIONS] } },
      }),
      prisma.case.count({ where: { ...where, resolution: "REJECTED" } }),
      prisma.case.count({ where: { ...where, resolution: { not: null } } }),
      prisma.case.findMany({
        where: { ...where, resolvedAt: { not: null } },
        select: { receivedAt: true, resolvedAt: true },
      }),
    ]);

  let avgResolutionDays: number | null = null;
  if (resolved.length > 0) {
    const total = resolved.reduce((acc, r) => {
      if (!r.resolvedAt) return acc;
      return acc + Math.max(0, differenceInCalendarDays(r.resolvedAt, r.receivedAt));
    }, 0);
    avgResolutionDays = total / resolved.length;
  }

  return {
    totalCases,
    decidedCases,
    approvedCases,
    rejectedCases,
    approvedPct: decidedCases > 0 ? (approvedCases / decidedCases) * 100 : null,
    rejectedPct: decidedCases > 0 ? (rejectedCases / decidedCases) * 100 : null,
    avgResolutionDays,
  };
}

async function topItemField(
  field: "productName" | "defectType" | "supplier",
  caseIds: string[],
  limit = 10,
): Promise<Array<{ value: string; count: number }>> {
  if (caseIds.length === 0) return [];

  const itemWhere: Prisma.CaseItemWhereInput = {
    caseId: { in: caseIds },
    [field]: { not: null },
  };
  const itemSelect: Prisma.CaseItemSelect = { [field]: true };

  const items = await prisma.caseItem.findMany({
    where: itemWhere,
    select: itemSelect,
  });

  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = (item as Record<string, unknown>)[field];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function getResolutionBreakdown(
  where: Prisma.CaseWhereInput,
): Promise<ResolutionRow[]> {
  const grouped = await prisma.case.groupBy({
    by: ["resolution"],
    where: { ...where, resolution: { not: null } },
    _count: { _all: true },
  });

  const total = grouped.reduce((acc, g) => acc + g._count._all, 0);
  return grouped
    .filter((g): g is typeof g & { resolution: Resolution } => g.resolution !== null)
    .map((g) => ({
      resolution: g.resolution,
      count: g._count._all,
      pct: total > 0 ? (g._count._all / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

async function getRefunds(where: Prisma.CaseWhereInput): Promise<RefundBreakdown> {
  const grouped = await prisma.case.groupBy({
    by: ["type"],
    where: { ...where, refundAmount: { not: null } },
    _sum: { refundAmount: true },
  });

  const byType: Record<CaseType, number> = { ...EMPTY_REFUND_BY_TYPE };
  let total = 0;
  for (const g of grouped) {
    const sum = g._sum.refundAmount ? Number(g._sum.refundAmount) : 0;
    byType[g.type] = sum;
    total += sum;
  }
  return { total, byType };
}

async function getMonthlyResolution(
  where: Prisma.CaseWhereInput,
): Promise<MonthlyResolution[]> {
  const cases = await prisma.case.findMany({
    where: { ...where, resolvedAt: { not: null } },
    select: { receivedAt: true, resolvedAt: true },
    orderBy: { resolvedAt: "asc" },
  });

  const buckets = new Map<string, { count: number; sumDays: number }>();
  for (const c of cases) {
    if (!c.resolvedAt) continue;
    const month = `${c.resolvedAt.getFullYear()}-${String(c.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
    const days = Math.max(0, differenceInCalendarDays(c.resolvedAt, c.receivedAt));
    const cur = buckets.get(month) ?? { count: 0, sumDays: 0 };
    cur.count += 1;
    cur.sumDays += days;
    buckets.set(month, cur);
  }

  return Array.from(buckets.entries())
    .map(([month, b]) => ({
      month,
      count: b.count,
      avgDays: b.count > 0 ? b.sumDays / b.count : 0,
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
}

export async function getStats(filter: StatsFilter): Promise<StatsBundle> {
  const where = caseWhere(filter);

  const matchingCases = await prisma.case.findMany({
    where,
    select: { id: true },
  });
  const caseIds = matchingCases.map((c) => c.id);

  const [defectLabels, kpis, productsRaw, defectsRaw, suppliersRaw, resolutionBreakdown, refunds, monthly] =
    await Promise.all([
      getDefectLabelMap(),
      getKpis(where),
      topItemField("productName", caseIds),
      topItemField("defectType", caseIds),
      topItemField("supplier", caseIds),
      getResolutionBreakdown(where),
      getRefunds(where),
      getMonthlyResolution(where),
    ]);

  const topProducts: RankRow[] = productsRaw.map((r) => ({
    label: r.value,
    count: r.count,
  }));

  const topDefects: RankRow[] = defectsRaw.map((r) => ({
    label: defectLabels.get(r.value) ?? r.value,
    count: r.count,
  }));

  const topSuppliers: RankRow[] = suppliersRaw.map((r) => ({
    label: r.value,
    count: r.count,
  }));

  return {
    filter,
    kpis,
    topProducts,
    topDefects,
    topSuppliers,
    resolutionBreakdown,
    refunds,
    monthly,
  };
}
