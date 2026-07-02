"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  EVENT_STATUS_COLORS,
  type PopupEvent,
} from "@/lib/types";
import { todayStr } from "@/lib/format";
import { PageHeader, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import EventFormModal from "@/components/EventFormModal";

type EventRow = PopupEvent & { buildings: { name: string } | null };

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [buildingOptions, setBuildingOptions] = useState<{ id: string; name: string }[]>([]);
  const [modal, setModal] = useState<{ event?: EventRow; date?: string } | null>(null);

  useEffect(() => {
    supabase()
      .from("buildings")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBuildingOptions(data ?? []));
  }, []);

  useEffect(() => {
    // Fetch a padded window so leading/trailing grid days have their events too.
    const from = dateStr(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 20);
    const to = dateStr(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 10);
    supabase()
      .from("events")
      .select("*, buildings(name)")
      .gte("event_date", from)
      .lte("event_date", to)
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, [year, month]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // back to Sunday
    const days: { str: string; inMonth: boolean; day: number }[] = [];
    const d = new Date(start);
    for (let i = 0; i < 42; i++) {
      days.push({
        str: dateStr(d.getFullYear(), d.getMonth(), d.getDate()),
        inMonth: d.getMonth() === month,
        day: d.getDate(),
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [year, month]);

  const byDate = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const ev of events ?? []) {
      const list = m.get(ev.event_date) ?? [];
      list.push(ev);
      m.set(ev.event_date, list);
    }
    return m;
  }, [events]);

  function move(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  if (!events) return <Spinner />;

  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = todayStr();

  return (
    <div>
      <PageHeader title="Calendar" sub="Scheduled pop-ups. Click a day to add one.">
        <div className="flex items-center gap-1 rounded border border-[#d0d4e4] bg-white">
          <button
            onClick={() => move(-1)}
            aria-label="Previous month"
            className="px-2.5 py-2 text-[#676879] hover:bg-chrome"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <span className="w-40 text-center text-sm font-semibold">{monthName}</span>
          <button
            onClick={() => move(1)}
            aria-label="Next month"
            className="px-2.5 py-2 text-[#676879] hover:bg-chrome"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
        <button
          onClick={() => {
            setYear(now.getFullYear());
            setMonth(now.getMonth());
          }}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Today
        </button>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map(({ str, inMonth, day }) => {
            const dayEvents = byDate.get(str) ?? [];
            return (
              <div
                key={str}
                onClick={() => setModal({ date: str })}
                className={`min-h-16 cursor-pointer border-b border-r border-slate-100 p-1.5 transition hover:bg-primary-50/50 sm:min-h-24 ${
                  inMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
                }`}
              >
                <div
                  className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    str === today ? "bg-primary-500 font-bold text-white" : ""
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ event: ev });
                      }}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${EVENT_STATUS_COLORS[ev.status]}`}
                      title={`${ev.buildings?.name ?? ev.title}${ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ""}`}
                    >
                      {ev.start_time ? `${ev.start_time.slice(0, 5)} ` : ""}
                      {ev.buildings?.name ?? ev.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <EventFormModal
          event={modal.event ?? null}
          buildingOptions={buildingOptions}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
          onSaved={(ev) => {
            const withName = {
              ...ev,
              buildings: {
                name:
                  buildingOptions.find((b) => b.id === ev.building_id)?.name ?? "Building",
              },
            } as EventRow;
            setEvents(
              modal.event
                ? events.map((x) => (x.id === ev.id ? withName : x))
                : [...events, withName]
            );
            setModal(null);
          }}
          onDeleted={(id) => {
            setEvents(events.filter((x) => x.id !== id));
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
