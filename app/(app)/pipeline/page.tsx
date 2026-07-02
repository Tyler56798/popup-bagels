"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { STAGES, STAGE_LABELS, type Building, type Stage } from "@/lib/types";
import { daysSince } from "@/lib/format";
import { BuildingLink, PageHeader, ScoreDots, Spinner } from "@/components/ui";
import { STAGE_DOT_BG } from "@/lib/stageStyles";

export default function PipelinePage() {
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  useEffect(() => {
    supabase()
      .from("buildings")
      .select("*")
      .then(({ data }) => setBuildings((data as Building[]) ?? []));
  }, []);

  async function drop(stage: Stage) {
    setOverStage(null);
    if (!dragId || !buildings) return;
    const b = buildings.find((x) => x.id === dragId);
    setDragId(null);
    if (!b || b.stage === stage) return;
    const prev = b.stage;
    setBuildings(buildings.map((x) => (x.id === b.id ? { ...x, stage } : x)));
    const { error } = await supabase().from("buildings").update({ stage }).eq("id", b.id);
    if (error) setBuildings(buildings.map((x) => (x.id === b.id ? { ...x, stage: prev } : x)));
  }

  if (!buildings) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        sub="Drag a building card between stages. Changes save instantly and are logged."
      />
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {STAGES.map((stage) => {
          const cards = buildings
            .filter((b) => b.stage === stage)
            .sort((a, b) => (b.lead_score ?? -1) - (a.lead_score ?? -1));
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => drop(stage)}
              className={`flex min-h-[70vh] w-64 shrink-0 flex-col overflow-hidden rounded-lg border lg:w-auto ${
                overStage === stage
                  ? "border-primary-400 bg-primary-50"
                  : "border-[#e6e9f2] bg-chrome"
              }`}
            >
              <div
                className={`flex items-center justify-between px-3 py-2 ${STAGE_DOT_BG[stage]}`}
              >
                <h2 className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</h2>
                <span className="rounded bg-white/25 px-2 py-0.5 text-xs font-semibold text-white">
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {cards.map((b) => (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={() => setDragId(b.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={`cursor-grab rounded border border-slate-200 bg-white p-3 shadow-sm transition active:cursor-grabbing ${
                      dragId === b.id ? "opacity-40" : "hover:border-primary-300"
                    }`}
                  >
                    <BuildingLink id={b.id} name={b.name} />
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {b.submarket ?? "—"}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <ScoreDots score={b.lead_score} />
                      {(stage === "reached_out" || stage === "followed_up") && (
                        <span
                          className={`text-[11px] ${
                            (daysSince(b.last_contacted_at) ?? 99) >= 7
                              ? "font-medium text-status-red"
                              : "text-slate-400"
                          }`}
                        >
                          {b.last_contacted_at
                            ? `${daysSince(b.last_contacted_at)}d ago`
                            : "no touch"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
