"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import type { ProjectStats } from "@/app/dashboard/page";
import type { Project } from "@/lib/supabase/types";

interface DiaryTimelineEntry {
  created_at: string;
}

interface DashboardChartsProps {
  projects: Project[];
  statsMap: Record<string, ProjectStats>;
  diaryEntries: DiaryTimelineEntry[];
}

export function DashboardCharts({ projects, statsMap, diaryEntries }: DashboardChartsProps) {
  // Aggregate status across all active projects
  const statusData = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let done = 0;

    for (const p of projects) {
      const s = statsMap[p.id];
      if (!s) continue;
      open += s.open;
      inProgress += s.inProgress;
      done += s.done;
    }

    if (open + inProgress + done === 0) return null;

    return [
      { name: "Otevřené", value: open, fill: "var(--chart-1)" },
      { name: "Rozpracované", value: inProgress, fill: "var(--chart-4)" },
      { name: "Hotové", value: done, fill: "var(--chart-2)" },
    ];
  }, [projects, statsMap]);

  // Build activity timeline (last 30 days)
  const timelineData = useMemo(() => {
    if (diaryEntries.length === 0) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days: { date: string; count: number }[] = [];
    const countMap = new Map<string, number>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      countMap.set(key, 0);
      days.push({ date: key, count: 0 });
    }

    for (const entry of diaryEntries) {
      const key = entry.created_at.split("T")[0];
      if (countMap.has(key)) {
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    }

    return days.map((d) => ({
      date: new Date(d.date + "T00:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
      count: countMap.get(d.date) || 0,
    }));
  }, [diaryEntries]);

  if (!statusData && !timelineData) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      {statusData && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Přehled úkolů</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData} barSize={36}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {timelineData && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Aktivita (30 dní)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [String(value), "Záznamy"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
