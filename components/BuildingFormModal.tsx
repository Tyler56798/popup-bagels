"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  STAGES,
  STAGE_LABELS,
  VIABILITY_LABELS,
  type Building,
  type Stage,
  type Viability,
} from "@/lib/types";
import { Modal } from "./ui";

interface Props {
  building?: Building | null; // null/undefined = create
  onClose: () => void;
  onSaved: (b: Building) => void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function BuildingFormModal({ building, onClose, onSaved }: Props) {
  const editing = !!building;
  const [f, setF] = useState({
    name: building?.name ?? "",
    street_address: building?.street_address ?? "",
    zip: building?.zip ?? "",
    submarket: building?.submarket ?? "",
    class_rating: building?.class_rating ?? "",
    num_floors: building?.num_floors?.toString() ?? "",
    est_daytime_pop: building?.est_daytime_pop?.toString() ?? "",
    owner_entity: building?.owner_entity ?? "",
    property_manager: building?.property_manager ?? "",
    website: building?.website ?? "",
    viability: (building?.viability ?? "acceptable") as Viability,
    lead_score: building?.lead_score?.toString() ?? "3",
    wave: building?.wave?.toString() ?? "",
    stage: (building?.stage ?? "not_contacted") as Stage,
    mag_mile: building?.mag_mile ?? false,
    lat: building?.lat?.toString() ?? "",
    lng: building?.lng?.toString() ?? "",
    notes: building?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Name is required.";
    if (!f.street_address.trim()) errs.street_address = "Address is required.";
    if (f.num_floors && (!/^\d+$/.test(f.num_floors) || Number(f.num_floors) < 1))
      errs.num_floors = "Floors must be a positive number.";
    const score = Number(f.lead_score);
    if (f.lead_score && (!Number.isInteger(score) || score < 0 || score > 5))
      errs.lead_score = "Score is 0–5.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setApiError(null);
    const payload = {
      name: f.name.trim(),
      street_address: f.street_address.trim(),
      zip: f.zip.trim() || null,
      submarket: f.submarket.trim() || null,
      class_rating: f.class_rating.trim() || null,
      num_floors: f.num_floors ? Number(f.num_floors) : null,
      est_daytime_pop: f.est_daytime_pop ? Number(f.est_daytime_pop) : null,
      owner_entity: f.owner_entity.trim() || null,
      property_manager: f.property_manager.trim() || null,
      website: f.website.trim() || null,
      viability: f.viability,
      lead_score: f.lead_score ? Number(f.lead_score) : null,
      wave: f.wave ? Number(f.wave) : null,
      stage: f.stage,
      mag_mile: f.mag_mile,
      lat: f.lat ? Number(f.lat) : null,
      lng: f.lng ? Number(f.lng) : null,
      notes: f.notes.trim() || null,
    };

    const sb = supabase();
    const query = editing
      ? sb.from("buildings").update(payload).eq("id", building!.id)
      : sb.from("buildings").insert({ ...payload, building_key: `${slugify(f.name)}-${Date.now().toString(36)}` });
    const { data, error } = await query.select("*").single();
    setBusy(false);
    if (error) {
      setApiError(error.message);
      return;
    }
    onSaved(data as Building);
  }

  const input =
    "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <Modal title={editing ? `Edit ${building!.name}` : "Add building"} onClose={onClose} wide>
      <form onSubmit={save} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Building name *</span>
            <input className={input} value={f.name} onChange={set("name")} />
            {errors.name && <em className="text-xs text-status-red">{errors.name}</em>}
          </label>
          <label className="block">
            <span className={label}>Street address *</span>
            <input className={input} value={f.street_address} onChange={set("street_address")} />
            {errors.street_address && (
              <em className="text-xs text-status-red">{errors.street_address}</em>
            )}
          </label>
          <label className="block">
            <span className={label}>ZIP</span>
            <input className={input} value={f.zip} onChange={set("zip")} />
          </label>
          <label className="block">
            <span className={label}>Submarket</span>
            <input className={input} value={f.submarket} onChange={set("submarket")} placeholder="The Loop" />
          </label>
          <label className="block">
            <span className={label}>Building class</span>
            <input className={input} value={f.class_rating} onChange={set("class_rating")} placeholder="A / A+ / B" />
          </label>
          <label className="block">
            <span className={label}>Floors</span>
            <input className={input} value={f.num_floors} onChange={set("num_floors")} inputMode="numeric" />
            {errors.num_floors && <em className="text-xs text-status-red">{errors.num_floors}</em>}
          </label>
          <label className="block">
            <span className={label}>Est. daytime population</span>
            <input className={input} value={f.est_daytime_pop} onChange={set("est_daytime_pop")} inputMode="numeric" />
          </label>
          <label className="block">
            <span className={label}>Owner</span>
            <input className={input} value={f.owner_entity} onChange={set("owner_entity")} />
          </label>
          <label className="block">
            <span className={label}>Property manager</span>
            <input className={input} value={f.property_manager} onChange={set("property_manager")} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Website</span>
            <input className={input} value={f.website} onChange={set("website")} placeholder="https://…" />
          </label>
          <label className="block">
            <span className={label}>Pop-up viability</span>
            <select className={input} value={f.viability} onChange={set("viability")}>
              {(Object.keys(VIABILITY_LABELS) as Viability[]).map((v) => (
                <option key={v} value={v}>
                  {VIABILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Lead score (0–5)</span>
            <input className={input} value={f.lead_score} onChange={set("lead_score")} inputMode="numeric" />
            {errors.lead_score && <em className="text-xs text-status-red">{errors.lead_score}</em>}
          </label>
          <label className="block">
            <span className={label}>Outreach wave</span>
            <input className={input} value={f.wave} onChange={set("wave")} inputMode="numeric" />
          </label>
          <label className="block">
            <span className={label}>Stage</span>
            <select className={input} value={f.stage} onChange={set("stage")}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Latitude</span>
            <input className={input} value={f.lat} onChange={set("lat")} placeholder="41.88…" />
          </label>
          <label className="block">
            <span className={label}>Longitude</span>
            <input className={input} value={f.lng} onChange={set("lng")} placeholder="-87.63…" />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.mag_mile} onChange={set("mag_mile")} />
            <span className="text-sm font-medium text-slate-700">Magnificent Mile cohort</span>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Notes</span>
            <textarea className={input} rows={3} value={f.notes} onChange={set("notes")} />
          </label>
        </div>

        {apiError && <p className="mt-3 text-sm text-status-red">{apiError}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Add building"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
