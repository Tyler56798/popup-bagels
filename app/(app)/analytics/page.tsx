"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  STAGES,
  STAGE_LABELS,
  VIABILITY_LABELS,
  type Building,
  type PopupEvent,
  type Stage,
  type StageChange,
  type Viability,
} from "@/lib/types";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { PageHeader, Spinner } from "@/components/ui";

type EventRow = PopupEvent & { buildings: { name: string } | null };

export default function AnalyticsPage() {
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [changes, setChanges] = useState<StageChange[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    const sb = supabase();
    sb.from("buildings")
      .select("*")
      .then(({ data }) => setBuildings((data as Building[]) ?? []));
    sb.from("stage_changes")
      .select("*")
      .order("changed_at")
      .then(({ data }) => setChanges((data as StageChange[]) ?? []));
    sb.from("events")
      .select("*, buildings(name)")
      .eq("status", "completed")
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, []);

  const funnel = useMemo(() => {
    if (!buildings) return [];
    const reachedIdx = (s: Stage) => STAGES.indexOf(s);
    // "Reached at least stage X" — declined counts as having been worked.
    const total = buildings.length;
    const contacted = buildings.filter((b) => b.stage !== "not_contacted").length;
    const followed = buildings.filter(
      (b) => reachedIdx(b.stage) >= reachedIdx("followed_up") && b.stage !== "declined"
    ).length;
    const booked = buildings.filter((b) => b.stage === "booked").length;
    return [
      { label: "Total leads", n: total },
      { label: "Contacted", n: contacted },
      { label: "In conversation", n: followed },
      { label: "Booked", n: booked },
    ];
  }, [buildings]);

  const timeInStage = useMemo(() => {
    const sums: Partial<Record<Stage, { days: number; n: number }>> = {};
    const byBuilding = new Map<string, StageChange[]>();
    for (const c of changes) {
      const list = byBuilding.get(c.building_id) ?? [];
      list.push(c);
      byBuilding.set(c.building_id, list);
    }
    for (const list of byBuilding.values()) {
      for (let i = 1; i < list.length; i++) {
        const from = list[i].from_stage;
        if (!from) continue;
        const days =
          (new Date(list[i].changed_at).getTime() - new Date(list[i - 1].changed_at).getTime()) /
          86_400_000;
        const slot = (sums[from] ??= { days: 0, n: 0 });
        slot.days += days;
        slot.n++;
      }
    }
    return STAGES.filter((s) => sums[s]?.n).map((s) => ({
      stage: s,
      avg: sums[s]!.days / sums[s]!.n,
    }));
  }, [changes]);

  if (!buildings) return <Spinner />;

  const bookRateBy = (key: (b: Building) => string | null) => {
    const groups = new Map<string, { total: number; booked: number }>();
    for (const b of buildings) {
      const k = key(b);
      if (!k) continue;
      const g = groups.get(k) ?? { total: 0, booked: 0 };
      g.total++;
      if (b.stage === "booked") g.booked++;
      groups.set(k, g);
    }
    return [...groups.entries()]
      .map(([label, g]) => ({ label, ...g, rate: g.booked / g.total }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  };

  const bySubmarket = bookRateBy((b) => b.submarket);
  const byViability = bookRateBy((b) =>
    b.viability ? VIABILITY_LABELS[b.viability as Viability] : null
  );
  const byWave = bookRateBy((b) => (b.wave != null ? `Wave ${b.wave}` : null));
  const byScore = bookRateBy((b) => (b.lead_score != null ? `Score ${b.lead_score}` : null));

  const totalRevenue = events.reduce((s, e) => s + (Number(e.revenue) || 0), 0);
  const totalUnits = events.reduce((s, e) => s + (e.units_sold || 0), 0);
  const topEvents = [...events]
    .filter((e) => e.revenue != null)
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 5);

  const maxFunnel = funnel[0]?.n || 1;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Analytics" sub="How the pipeline converts and which buildings perform." />

      {/* Funnel */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold">Pipeline funnel</h2>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-32 text-sm text-slate-600">{f.label}</div>
              <div className="h-7 flex-1 rounded bg-slate-100">
                <div
                  className="flex h-7 items-center rounded bg-primary-500 px-2 text-xs font-semibold text-white"
                  style={{ width: `${Math.max((f.n / maxFunnel) * 100, 6)}%` }}
                >
                  {f.n}
                </div>
              </div>
              <div className="w-20 text-right text-xs text-slate-500">
                {i > 0 && funnel[i - 1].n > 0
                  ? `${Math.round((f.n / funnel[i - 1].n) * 100)}% of prev`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booked-rate breakdowns */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <RateCard title="Booked rate by submarket" rows={bySubmarket} />
        <RateCard title="Booked rate by viability" rows={byViability} />
        <RateCard title="Booked rate by lead score" rows={byScore} note="Does the scoring model predict wins?" />
        <RateCard title="Booked rate by outreach wave" rows={byWave} />
      </div>

      {/* Time in stage */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-semibold">Average time in stage</h2>
        <p className="mb-4 text-xs text-slate-500">
          From stage-change history. Builds up as the team works the pipeline.
        </p>
        {timeInStage.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            Not enough stage history yet. Move buildings through the pipeline and this fills in.
          </p>
        ) : (
          <div className="space-y-2">
            {timeInStage.map(({ stage, avg }) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-32 text-sm text-slate-600">{STAGE_LABELS[stage]}</div>
                <div className="h-5 flex-1 rounded bg-slate-100">
                  <div
                    className="h-5 rounded bg-status-purple"
                    style={{
                      width: `${Math.min((avg / Math.max(...timeInStage.map((t) => t.avg))) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="w-16 text-right text-sm tabular-nums text-slate-600">
                  {avg.toFixed(1)}d
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Event results */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold">Pop-up results</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded bg-slate-50 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{events.length}</div>
            <div className="text-xs text-slate-500">completed pop-ups</div>
          </div>
          <div className="rounded bg-slate-50 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{fmtMoney(totalRevenue)}</div>
            <div className="text-xs text-slate-500">total revenue</div>
          </div>
          <div className="rounded bg-slate-50 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{fmtNumber(totalUnits)}</div>
            <div className="text-xs text-slate-500">bagels sold</div>
          </div>
        </div>
        {topEvents.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-600">Top buildings by revenue</h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {topEvents.map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  <span>{e.buildings?.name ?? e.title}</span>
                  <span className="font-medium tabular-nums">{fmtMoney(Number(e.revenue))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {events.length === 0 && (
          <p className="mt-4 text-center text-sm text-slate-400">
            Mark events as completed (with revenue) and results appear here. That&apos;s how you
            learn which buildings are worth repeating.
          </p>
        )}
      </section>
    </div>
  );
}

function RateCard({
  title,
  rows,
  note,
}: {
  title: string;
  rows: { label: string; total: number; booked: number; rate: number }[];
  note?: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No data.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 8).map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-28 truncate text-sm text-slate-600" title={r.label}>
                {r.label}
              </div>
              <div className="h-4 flex-1 rounded bg-slate-100">
                <div
                  className="h-4 rounded bg-status-green"
                  style={{ width: `${Math.round(r.rate * 100)}%` }}
                />
              </div>
              <div className="w-24 text-right text-xs tabular-nums text-slate-500">
                {r.booked}/{r.total} · {Math.round(r.rate * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
