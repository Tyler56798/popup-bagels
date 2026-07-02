"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { STAGES, STAGE_LABELS, type Building, type Stage } from "@/lib/types";
import { PageHeader, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { STAGE_DOT_BG } from "@/lib/stageStyles";

// The Google Maps SDK is browser-only — skip SSR entirely.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <Spinner />,
});

/** Nearest-neighbor walking order starting from the first stop picked. */
function orderRoute(stops: Building[]): Building[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const ordered = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((b, i) => {
      const d = (b.lat! - last.lat!) ** 2 + (b.lng! - last.lng!) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

export default function MapPage() {
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [stageFilter, setStageFilter] = useState<Set<Stage>>(new Set(STAGES));
  const [planMode, setPlanMode] = useState(false);
  const [stops, setStops] = useState<Building[]>([]);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  async function logVisit(b: Building) {
    const { error } = await supabase()
      .from("activities")
      .insert({ building_id: b.id, type: "visit", summary: "Lobby visit" });
    if (!error) setLoggedIds((prev) => new Set(prev).add(b.id));
  }

  useEffect(() => {
    supabase()
      .from("buildings")
      .select("*")
      .then(({ data }) => setBuildings((data as Building[]) ?? []));
  }, []);

  const visible = useMemo(
    () => (buildings ?? []).filter((b) => stageFilter.has(b.stage)),
    [buildings, stageFilter]
  );
  const route = useMemo(() => orderRoute(stops), [stops]);

  function toggleStage(s: Stage) {
    const next = new Set(stageFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStageFilter(next);
  }

  function toggleStop(b: Building) {
    setStops((prev) =>
      prev.some((x) => x.id === b.id) ? prev.filter((x) => x.id !== b.id) : [...prev, b]
    );
  }

  const gmapsUrl = useMemo(() => {
    const pts = route.filter((b) => b.lat != null && b.lng != null);
    if (pts.length < 2) return null;
    const coord = (b: Building) => `${b.lat},${b.lng}`;
    const p = new URLSearchParams({
      api: "1",
      origin: coord(pts[0]),
      destination: coord(pts[pts.length - 1]),
      travelmode: "walking",
    });
    if (pts.length > 2)
      p.set("waypoints", pts.slice(1, -1).map(coord).join("|"));
    return `https://www.google.com/maps/dir/?${p.toString()}`;
  }, [route]);

  if (!buildings) return <Spinner />;

  const missing = buildings.filter((b) => b.lat == null || b.lng == null).length;

  return (
    <div className="flex h-[calc(100dvh-16rem)] flex-col lg:h-[calc(100vh-8rem)]">
      <PageHeader
        title="Map"
        sub={`${visible.length} buildings shown${missing ? ` · ${missing} missing coordinates` : ""}`}
      >
        <button
          onClick={() => {
            setPlanMode(!planMode);
            if (planMode) setStops([]);
          }}
          className={`rounded px-3 py-2 text-sm font-semibold transition ${
            planMode
              ? "bg-primary-500 text-white hover:bg-primary-600"
              : "border border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          {planMode ? (
            "Exit day planner"
          ) : (
            <span className="flex items-center gap-1.5">
              <Icon name="walk" size={16} />
              Plan a walking day
            </span>
          )}
        </button>
      </PageHeader>

      {/* Stage filter chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStage(s)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
              stageFilter.has(s)
                ? "bg-white text-slate-800 ring-slate-300"
                : "bg-slate-100 text-slate-400 ring-slate-200 line-through"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${STAGE_DOT_BG[s]}`} />
            {STAGE_LABELS[s]}
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-400">
          Pin size = daytime population. Click a pin for details.
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
          <MapView
            buildings={visible}
            planMode={planMode}
            route={route}
            onTogglePlanStop={toggleStop}
            onLogVisit={logVisit}
            loggedIds={loggedIds}
          />
        </div>

        {planMode && (
          <aside className="max-h-52 w-full shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 lg:max-h-none lg:w-72">
            <h2 className="font-semibold">Walking route</h2>
            <p className="mt-1 text-xs text-slate-500">
              Click pins to add stops. The order optimizes for shortest walk from your first stop.
            </p>
            {route.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No stops yet.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {route.map((b, i) => (
                  <li key={b.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{b.name}</div>
                      <div className="truncate text-xs text-slate-500">{b.street_address}</div>
                    </div>
                    <button
                      onClick={() => toggleStop(b)}
                      aria-label={`Remove ${b.name} from route`}
                      className="ml-auto text-slate-400 hover:text-status-red"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {gmapsUrl && (
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded bg-primary-500 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Open in Google Maps
                <Icon name="external" size={14} />
              </a>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
