"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  COI_STATUS_LABELS,
  EVENT_STATUS_LABELS,
  type CoiStatus,
  type EventStatus,
  type PopupEvent,
} from "@/lib/types";
import { todayStr } from "@/lib/format";
import { Modal } from "./ui";

interface BuildingOption {
  id: string;
  name: string;
}

interface Props {
  event?: PopupEvent | null;
  buildingId?: string; // preselected (from a building page)
  buildingOptions?: BuildingOption[]; // for calendar-created events
  defaultDate?: string;
  onClose: () => void;
  onSaved: (ev: PopupEvent) => void;
  onDeleted?: (id: string) => void;
}

export default function EventFormModal({
  event,
  buildingId,
  buildingOptions,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const editing = !!event;
  const [f, setF] = useState({
    building_id: event?.building_id ?? buildingId ?? buildingOptions?.[0]?.id ?? "",
    title: event?.title ?? "Bagel pop-up",
    event_date: event?.event_date ?? defaultDate ?? todayStr(),
    start_time: event?.start_time?.slice(0, 5) ?? "07:00",
    end_time: event?.end_time?.slice(0, 5) ?? "10:00",
    status: (event?.status ?? "tentative") as EventStatus,
    location_note: event?.location_note ?? "",
    load_in_notes: event?.load_in_notes ?? "",
    coi_status: (event?.coi_status ?? "pending") as CoiStatus,
    revenue: event?.revenue?.toString() ?? "",
    units_sold: event?.units_sold?.toString() ?? "",
    result_notes: event?.result_notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.building_id || !f.event_date) {
      setError("Building and date are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      building_id: f.building_id,
      title: f.title.trim() || "Bagel pop-up",
      event_date: f.event_date,
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      status: f.status,
      location_note: f.location_note.trim() || null,
      load_in_notes: f.load_in_notes.trim() || null,
      coi_status: f.coi_status,
      revenue: f.revenue ? Number(f.revenue) : null,
      units_sold: f.units_sold ? Number(f.units_sold) : null,
      result_notes: f.result_notes.trim() || null,
    };
    const sb = supabase();
    const q = editing
      ? sb.from("events").update(payload).eq("id", event!.id)
      : sb.from("events").insert(payload);
    const { data, error: err } = await q.select("*").single();
    setBusy(false);
    if (err) setError(err.message);
    else onSaved(data as PopupEvent);
  }

  async function remove() {
    if (!editing || !onDeleted) return;
    setBusy(true);
    const { error: err } = await supabase().from("events").delete().eq("id", event!.id);
    setBusy(false);
    if (err) setError(err.message);
    else onDeleted(event!.id);
  }

  const input =
    "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-stone-700";
  const showResults = f.status === "completed";

  return (
    <Modal title={editing ? "Edit pop-up" : "Schedule pop-up"} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {buildingOptions && !buildingId ? (
            <label className="block sm:col-span-2">
              <span className={label}>Building</span>
              <select className={input} value={f.building_id} onChange={set("building_id")}>
                {buildingOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block sm:col-span-2">
            <span className={label}>Title</span>
            <input className={input} value={f.title} onChange={set("title")} />
          </label>
          <label className="block">
            <span className={label}>Date</span>
            <input type="date" className={input} value={f.event_date} onChange={set("event_date")} />
          </label>
          <label className="block">
            <span className={label}>Status</span>
            <select className={input} value={f.status} onChange={set("status")}>
              {Object.entries(EVENT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Start</span>
            <input type="time" className={input} value={f.start_time} onChange={set("start_time")} />
          </label>
          <label className="block">
            <span className={label}>End</span>
            <input type="time" className={input} value={f.end_time} onChange={set("end_time")} />
          </label>
          <label className="block">
            <span className={label}>COI / insurance</span>
            <select className={input} value={f.coi_status} onChange={set("coi_status")}>
              {Object.entries(COI_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Lobby location</span>
            <input
              className={input}
              value={f.location_note}
              onChange={set("location_note")}
              placeholder="NW corner by security desk"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Load-in notes</span>
            <textarea
              className={input}
              rows={2}
              value={f.load_in_notes}
              onChange={set("load_in_notes")}
              placeholder="Dock on Lower Wacker, freight elevator #3, arrive 6:15am…"
            />
          </label>

          {showResults && (
            <>
              <label className="block">
                <span className={label}>Revenue ($)</span>
                <input className={input} value={f.revenue} onChange={set("revenue")} inputMode="decimal" />
              </label>
              <label className="block">
                <span className={label}>Bagels sold</span>
                <input className={input} value={f.units_sold} onChange={set("units_sold")} inputMode="numeric" />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Result notes</span>
                <textarea
                  className={input}
                  rows={2}
                  value={f.result_notes}
                  onChange={set("result_notes")}
                  placeholder="Sold out by 9:15, GM wants monthly slot…"
                />
              </label>
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          {editing && onDeleted ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              Delete event
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
