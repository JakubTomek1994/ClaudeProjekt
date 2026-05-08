import { format, parse } from "date-fns";
import { cs } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatsBar } from "@/components/stats/stats-bar";
import { StatsFilter } from "@/components/stats/stats-filter";
import { CASE_TYPE_LABELS, RESOLUTION_LABELS } from "@/lib/case/labels";
import { formatCurrency } from "@/lib/format";
import {
  PERIOD_LABEL,
  getStats,
  parseFilter,
  type RankRow,
  type StatsBundle,
} from "@/lib/stats/queries";

export const metadata = { title: "Statistiky – Reklamace" };

export default async function StatsPage(props: {
  searchParams: Promise<{ period?: string; type?: string }>;
}) {
  const sp = await props.searchParams;
  const filter = parseFilter(sp);
  const stats = await getStats(filter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reporty"
        title="Statistiky"
        description={`${PERIOD_LABEL[filter.period]}${filter.type ? ` · ${CASE_TYPE_LABELS[filter.type]}` : ""}.`}
        actions={
          <StatsFilter
            initialPeriod={filter.period}
            initialType={filter.type ?? ""}
          />
        }
      />

      <KpiSection stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard title="Top reklamované produkty" rows={stats.topProducts} accent="brand" />
        <RankCard title="Top vady" rows={stats.topDefects} accent="neutral" />
        <RankCard title="Top dodavatelé" rows={stats.topSuppliers} accent="muted" />
        <ResolutionCard stats={stats} />
      </div>

      <RefundsSection stats={stats} />
      <MonthlySection stats={stats} />
    </div>
  );
}

function KpiSection({ stats }: { stats: StatsBundle }) {
  const k = stats.kpis;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        eyebrow="Celkem případů"
        value={String(k.totalCases)}
        hint={`${k.decidedCases} rozhodnuto`}
        accent="dark"
      />
      <KpiCard
        eyebrow="% uznaných"
        value={k.approvedPct === null ? "—" : `${k.approvedPct.toFixed(0)} %`}
        hint={`${k.approvedCases} z ${k.decidedCases}`}
        accent="brand"
      />
      <KpiCard
        eyebrow="% zamítnutých"
        value={k.rejectedPct === null ? "—" : `${k.rejectedPct.toFixed(0)} %`}
        hint={`${k.rejectedCases} z ${k.decidedCases}`}
        accent="muted"
      />
      <KpiCard
        eyebrow="Průměrná doba vyřízení"
        value={k.avgResolutionDays === null ? "—" : `${k.avgResolutionDays.toFixed(1)} d`}
        hint="Od přijetí po vyřešení"
        accent="dark"
      />
    </section>
  );
}

function KpiCard({
  eyebrow,
  value,
  hint,
  accent,
}: {
  eyebrow: string;
  value: string;
  hint?: string;
  accent: "brand" | "dark" | "muted";
}) {
  const valueClass = {
    brand: "text-foreground",
    dark: "text-foreground",
    muted: "text-muted-foreground",
  }[accent];
  const dotClass = {
    brand: "bg-brand",
    dark: "bg-foreground",
    muted: "bg-muted-foreground/40",
  }[accent];
  return (
    <Card className="border-border/80">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
          <span className="small-caps text-muted-foreground">{eyebrow}</span>
        </div>
        <div
          className={`font-display text-4xl font-semibold leading-none tracking-tight tabular ${valueClass}`}
        >
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function RankCard({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: RankRow[];
  accent: "brand" | "neutral" | "muted";
}) {
  const max = rows.length > 0 ? rows[0].count : 0;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="small-caps text-[10px] text-muted-foreground/85">Žebříček</p>
          <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádná data v tomto období.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row, idx) => (
              <li key={`${row.label}-${idx}`} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="font-mono text-xs tabular text-muted-foreground">
                    {row.count}×
                  </span>
                </div>
                <StatsBar value={row.count} max={max} accent={accent} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResolutionCard({ stats }: { stats: StatsBundle }) {
  const rows = stats.resolutionBreakdown;
  const max = rows.length > 0 ? rows[0].count : 0;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="small-caps text-[10px] text-muted-foreground/85">Vyřízení</p>
          <h3 className="font-display text-lg font-medium tracking-tight">
            Rozdělení rezolucí
          </h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádná rozhodnutá řízení v tomto období.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.resolution} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{RESOLUTION_LABELS[r.resolution]}</span>
                  <span className="font-mono text-xs tabular text-muted-foreground">
                    {r.count}× · {r.pct.toFixed(0)} %
                  </span>
                </div>
                <StatsBar
                  value={r.count}
                  max={max}
                  accent={r.resolution === "REJECTED" ? "brand" : "neutral"}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RefundsSection({ stats }: { stats: StatsBundle }) {
  const { total, byType } = stats.refunds;
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        eyebrow="Finanční dopad celkem"
        value={formatCurrency(total)}
        hint="Vrácené prostředky"
        accent="dark"
      />
      <KpiCard
        eyebrow="Reklamace"
        value={formatCurrency(byType.REKLAMACE)}
        accent="brand"
      />
      <KpiCard
        eyebrow="Odstoupení"
        value={formatCurrency(byType.ODSTOUPENI)}
        accent="muted"
      />
    </section>
  );
}

function MonthlySection({ stats }: { stats: StatsBundle }) {
  const rows = stats.monthly;
  if (rows.length === 0) {
    return (
      <section className="space-y-4">
        <div>
          <p className="small-caps text-[10px] text-muted-foreground/85">Trend</p>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Doba vyřízení po měsících
          </h2>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Žádné vyřešené případy v tomto období.
          </CardContent>
        </Card>
      </section>
    );
  }

  const maxAvg = Math.max(...rows.map((r) => r.avgDays));

  return (
    <section className="space-y-4">
      <div>
        <p className="small-caps text-[10px] text-muted-foreground/85">Trend</p>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          Doba vyřízení po měsících
        </h2>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Měsíc</TableHead>
              <TableHead className="w-[120px]">Vyřízeno</TableHead>
              <TableHead className="w-[140px]">Průměr (dnů)</TableHead>
              <TableHead>Vizualizace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.month}>
                <TableCell className="font-medium">{formatMonth(r.month)}</TableCell>
                <TableCell className="font-mono tabular text-sm">{r.count}</TableCell>
                <TableCell className="font-mono tabular text-sm">
                  {r.avgDays.toFixed(1)}
                </TableCell>
                <TableCell>
                  <StatsBar value={r.avgDays} max={maxAvg} accent="neutral" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function formatMonth(yyyymm: string): string {
  try {
    const date = parse(`${yyyymm}-01`, "yyyy-MM-dd", new Date());
    return format(date, "LLLL yyyy", { locale: cs });
  } catch {
    return yyyymm;
  }
}
