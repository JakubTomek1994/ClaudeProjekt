export type StatsPeriod = "30d" | "90d" | "year" | "all";

export const STATS_PERIODS: StatsPeriod[] = ["30d", "90d", "year", "all"];

export const PERIOD_LABEL: Record<StatsPeriod, string> = {
  "30d": "Posledních 30 dní",
  "90d": "Posledních 90 dní",
  year: "Letošní rok",
  all: "Vše",
};
