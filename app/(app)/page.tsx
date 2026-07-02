"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  STAGES,
  STAGE_LABELS,
  FOLLOW_UP_DAYS,
  type Building,
  type Task,
  type PopupEvent,
  type Activity,
  type Stage,
  ACTIVITY_TYPE_META,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
} from "@/lib/types";
import { daysSince, fmtDate, fmtDateTime, todayStr } from "@/lib/format";
import { BuildingLink, PageHeader, Spinner, StageBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { STAGE_DOT_BG } from "@/lib/stageStyles";

type TaskRow = Task & { buildings: { name: string } | null };
type EventRow = PopupEvent & { buildings: { name: string } | null };
type ActivityRow = Activity & { buildings: { name: string } | null };

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [recent, setRecent] = useState<ActivityRow[]>([]);

  useEffect(() => {
    const sb = supabase();
    sb.from("buildings")
      .select("*")
      .then(({ data }) => setBuildings((data as Building[]) ?? []));
    sb.from("tasks")
      .select("*, buildings(name)")
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(12)
      .then(({ data }) => setTasks((data as TaskRow[]) ?? []));
    sb.from("events")
      .select("*, buildings(name)")
      .gte("event_date", todayStr())
      .neq("status", "cancelled")
      .order("event_date")
      .limit(6)
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
    sb.from("activities")
      .select("*, buildings(name)")
      .order("occurred_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setRecent((data as ActivityRow[]) ?? []));
  }, []);

  if (!buildings) return <Spinner />;

  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const b of buildings) counts[b.stage]++;

  const followUps = buildings
    .filter((b) => {
      if (b.stage !== "reached_out" && b.stage !== "followed_up") return false;
      const d = daysSince(b.last_contacted_at);
      return d === null || d >= FOLLOW_UP_DAYS;
    })
    .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
    .slice(0, 8);

  const today = todayStr();
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today);
  const dueSoon = tasks.filter((t) => !t.due_date || t.due_date >= today);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        sub={`${buildings.length} buildings in the pipeline · ${counts.booked} booked`}
      />

      {/* Stage stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={`/buildings?stage=${s}`}
            className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:shadow-sm"
          >
            <div className="text-3xl font-semibold tabular-nums">{counts[s]}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#676879]">
              <span className={`h-2 w-2 rounded-full ${STAGE_DOT_BG[s]}`} />
              {STAGE_LABELS[s]}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Follow-up queue */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold">Needs a follow-up</h2>
            <span className="text-xs text-slate-500">
              no touch in {FOLLOW_UP_DAYS}+ days
            </span>
          </header>
          {followUps.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Nothing stale. The pipeline is fresh.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {followUps.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <BuildingLink id={b.id} name={b.name} />
                    <div className="text-xs text-slate-500">
                      {b.submarket ?? "—"} ·{" "}
                      {b.last_contacted_at
                        ? `last touch ${daysSince(b.last_contacted_at)}d ago`
                        : "never logged a touch"}
                    </div>
                  </div>
                  <StageBadge stage={b.stage} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold">Open tasks</h2>
            {overdue.length > 0 && (
              <span className="rounded bg-status-red px-2 py-0.5 text-xs font-medium text-white">
                {overdue.length} overdue
              </span>
            )}
          </header>
          {tasks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No open tasks. Add them from any building page.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...overdue, ...dueSoon].slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {t.buildings ? (
                        <BuildingLink id={t.building_id!} name={t.buildings.name} />
                      ) : (
                        "General"
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      t.due_date && t.due_date < today ? "text-status-red" : "text-slate-500"
                    }`}
                  >
                    {t.due_date ? fmtDate(t.due_date) : "no date"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming events */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold">Upcoming pop-ups</h2>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              Calendar
              <Icon name="arrow-right" size={12} />
            </Link>
          </header>
          {events.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Nothing scheduled yet. Book a building and add its event.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {ev.buildings ? (
                        <BuildingLink id={ev.building_id} name={ev.buildings.name} />
                      ) : (
                        ev.title
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtDate(ev.event_date)}
                      {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ""}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded px-2.5 py-0.5 text-xs font-medium ${EVENT_STATUS_COLORS[ev.status]}`}
                  >
                    {EVENT_STATUS_LABELS[ev.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold">Recent activity</h2>
          </header>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Outreach you log will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 text-[#676879]" title={ACTIVITY_TYPE_META[a.type].label}>
                    <Icon name={ACTIVITY_TYPE_META[a.type].icon as IconName} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.summary}</div>
                    <div className="text-xs text-slate-500">
                      {a.buildings && (
                        <>
                          <BuildingLink id={a.building_id} name={a.buildings.name} /> ·{" "}
                        </>
                      )}
                      {fmtDateTime(a.occurred_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
