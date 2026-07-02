"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  STAGES,
  STAGE_LABELS,
  VIABILITY_LABELS,
  type Building,
  type Stage,
  type Viability,
} from "@/lib/types";
import { downloadFile, fmtNumber, parseCsv, toCsv } from "@/lib/format";
import {
  BuildingLink,
  PageHeader,
  ScoreDots,
  Spinner,
  StageBadge,
  ViabilityBadge,
} from "@/components/ui";
import BuildingFormModal from "@/components/BuildingFormModal";

type SortKey = "score" | "pop" | "name" | "stage";

function BuildingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>(params.get("stage") ?? "");
  const [submarket, setSubmarket] = useState("");
  const [viability, setViability] = useState("");
  const [wave, setWave] = useState("");
  const [magMile, setMagMile] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [showAdd, setShowAdd] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase()
      .from("buildings")
      .select("*")
      .then(({ data }) => setBuildings((data as Building[]) ?? []));
  }, []);

  const submarkets = useMemo(
    () => [...new Set((buildings ?? []).map((b) => b.submarket).filter(Boolean))].sort() as string[],
    [buildings]
  );
  const waves = useMemo(
    () => [...new Set((buildings ?? []).map((b) => b.wave).filter((w) => w != null))].sort() as number[],
    [buildings]
  );

  const filtered = useMemo(() => {
    let list = buildings ?? [];
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.street_address.toLowerCase().includes(q) ||
          (b.aka ?? "").toLowerCase().includes(q)
      );
    if (stage) list = list.filter((b) => b.stage === stage);
    if (submarket) list = list.filter((b) => b.submarket === submarket);
    if (viability) list = list.filter((b) => b.viability === viability);
    if (wave) list = list.filter((b) => String(b.wave) === wave);
    if (magMile) list = list.filter((b) => b.mag_mile);
    const sorters: Record<SortKey, (a: Building, b: Building) => number> = {
      score: (a, b) => (b.lead_score ?? -1) - (a.lead_score ?? -1),
      pop: (a, b) => (b.est_daytime_pop ?? -1) - (a.est_daytime_pop ?? -1),
      name: (a, b) => a.name.localeCompare(b.name),
      stage: (a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage),
    };
    return [...list].sort(sorters[sort]);
  }, [buildings, search, stage, submarket, viability, wave, magMile, sort]);

  function exportCsv() {
    const columns = [
      "name",
      "street_address",
      "zip",
      "submarket",
      "class_rating",
      "num_floors",
      "est_daytime_pop",
      "owner_entity",
      "property_manager",
      "viability",
      "lead_score",
      "wave",
      "stage",
      "last_contacted_at",
      "notes",
    ];
    downloadFile(
      `popup-bagels-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(filtered as unknown as Record<string, unknown>[], columns)
    );
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) {
      setImportMsg("No rows found. Expected headers like: name, street_address, submarket, …");
      return;
    }
    const stageByLabel = Object.fromEntries(
      STAGES.map((s) => [STAGE_LABELS[s].toLowerCase(), s])
    );
    const payload = rows
      .filter((r) => (r.name ?? "").trim() && (r.street_address ?? r.address ?? "").trim())
      .map((r) => ({
        building_key: `${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.abs(
          [...r.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
        ).toString(36)}`,
        name: r.name.trim(),
        street_address: (r.street_address ?? r.address).trim(),
        zip: r.zip || null,
        submarket: r.submarket || null,
        class_rating: r.class_rating || null,
        num_floors: r.num_floors ? Number(r.num_floors) || null : null,
        est_daytime_pop: r.est_daytime_pop ? Number(r.est_daytime_pop) || null : null,
        owner_entity: r.owner_entity || null,
        property_manager: r.property_manager || null,
        viability: (["strong", "acceptable", "weak", "not_viable"].includes(r.viability)
          ? r.viability
          : null) as Viability | null,
        lead_score: r.lead_score ? Number(r.lead_score) || null : null,
        wave: r.wave ? Number(r.wave) || null : null,
        stage: (STAGES.includes(r.stage as Stage)
          ? r.stage
          : stageByLabel[(r.stage ?? "").toLowerCase()] ?? "not_contacted") as Stage,
        notes: r.notes || null,
      }));
    if (!payload.length) {
      setImportMsg("Rows are missing required name / street_address columns.");
      return;
    }
    const { data, error } = await supabase()
      .from("buildings")
      .upsert(payload, { onConflict: "building_key" })
      .select("*");
    if (error) setImportMsg(`Import failed: ${error.message}`);
    else {
      setImportMsg(`Imported ${data.length} buildings.`);
      const { data: all } = await supabase().from("buildings").select("*");
      setBuildings((all as Building[]) ?? []);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!buildings) return <Spinner />;

  const select =
    "rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none";

  return (
    <div>
      <PageHeader title="Buildings" sub={`${filtered.length} of ${buildings.length} shown`}>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
        >
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={importCsv} />
        <button
          onClick={exportCsv}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
        >
          Export CSV
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded bg-primary-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          + Add building
        </button>
      </PageHeader>

      {importMsg && (
        <p className="mb-4 rounded bg-primary-50 px-4 py-2 text-sm text-primary-800 ring-1 ring-primary-200">
          {importMsg}
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        />
        <select
          className={select}
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            router.replace(e.target.value ? `/buildings?stage=${e.target.value}` : "/buildings");
          }}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={select} value={submarket} onChange={(e) => setSubmarket(e.target.value)}>
          <option value="">All submarkets</option>
          {submarkets.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className={select} value={viability} onChange={(e) => setViability(e.target.value)}>
          <option value="">All viability</option>
          {Object.entries(VIABILITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select className={select} value={wave} onChange={(e) => setWave(e.target.value)}>
          <option value="">All waves</option>
          {waves.map((w) => (
            <option key={w} value={String(w)}>
              Wave {w}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={magMile} onChange={(e) => setMagMile(e.target.checked)} />
          Mag Mile
        </label>
        <div className="ml-auto">
          <select className={select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="score">Sort: lead score</option>
            <option value="pop">Sort: daytime population</option>
            <option value="name">Sort: name A–Z</option>
            <option value="stage">Sort: stage</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-chrome text-left text-xs font-medium text-[#676879]">
            <tr>
              <th className="px-4 py-3 font-medium">Building</th>
              <th className="px-4 py-3 font-medium">Submarket</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 text-right font-medium">Daytime pop.</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Viability</th>
              <th className="px-4 py-3 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <tr key={b.id} className="transition hover:bg-chrome">
                <td className="px-4 py-3">
                  <BuildingLink id={b.id} name={b.name} />
                  <div className="text-xs text-slate-500">{b.street_address}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{b.submarket ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{b.class_rating ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {fmtNumber(b.est_daytime_pop)}
                </td>
                <td className="px-4 py-3">
                  <ScoreDots score={b.lead_score} />
                </td>
                <td className="px-4 py-3">
                  <ViabilityBadge viability={b.viability} />
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={b.stage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            No buildings match these filters.
          </p>
        )}
      </div>

      {showAdd && (
        <BuildingFormModal
          onClose={() => setShowAdd(false)}
          onSaved={(b) => {
            setBuildings([...(buildings ?? []), b]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

export default function BuildingsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BuildingsContent />
    </Suspense>
  );
}
