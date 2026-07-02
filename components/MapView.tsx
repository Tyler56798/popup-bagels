"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { STAGE_LABELS, type Building } from "@/lib/types";
import { fmtNumber } from "@/lib/format";
import { STAGE_HEX } from "@/lib/stageStyles";
import { Icon } from "@/components/icons";

const PRIMARY = "#6161ff";

const CHICAGO_CENTER = { lat: 41.8832, lng: -87.6324 };

interface Props {
  buildings: Building[];
  planMode: boolean;
  route: Building[];
  onTogglePlanStop: (b: Building) => void;
  onLogVisit: (b: Building) => void;
  loggedIds: Set<string>;
}

/** Dashed walking-route line — imperative because the library has no Polyline component. */
function RouteLine({ route }: { route: Building[] }) {
  const map = useMap();
  const path = useMemo(
    () =>
      route
        .filter((b) => b.lat != null && b.lng != null)
        .map((b) => ({ lat: b.lat!, lng: b.lng! })),
    [route]
  );

  useEffect(() => {
    if (!map || path.length < 2) return;
    const line = new google.maps.Polyline({
      map,
      path,
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeWeight: 3, strokeColor: PRIMARY },
          offset: "0",
          repeat: "14px",
        },
      ],
    });
    return () => line.setMap(null);
  }, [map, path]);

  return null;
}

export default function MapView({
  buildings,
  planMode,
  route,
  onTogglePlanStop,
  onLogVisit,
  loggedIds,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center text-sm text-slate-600">
          <div className="flex justify-center text-slate-400">
            <Icon name="pin" size={32} />
          </div>
          <h2 className="mt-2 font-semibold text-slate-800">Google Maps key needed</h2>
          <p className="mt-2">
            Add <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            to <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">.env.local</code> and reload.
            Create the key at console.cloud.google.com under APIs &amp; Services, Credentials, with
            the &quot;Maps JavaScript API&quot; enabled.
          </p>
        </div>
      </div>
    );
  }

  const stopIndexById = new globalThis.Map(route.map((b, i) => [b.id, i]));
  const open = openId ? buildings.find((b) => b.id === openId) ?? null : null;
  const openStopIdx = open ? stopIndexById.get(open.id) : undefined;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={CHICAGO_CENTER}
        defaultZoom={14}
        mapId="DEMO_MAP_ID" /* Google's placeholder ID enables Advanced Markers; make a styled one in the console later if wanted */
        gestureHandling="greedy"
        clickableIcons={false}
        className="h-full w-full"
      >
        <RouteLine route={route} />

        {buildings.map((b) => {
          if (b.lat == null || b.lng == null) return null;
          const stopIdx = stopIndexById.get(b.id);
          const selected = stopIdx !== undefined;
          // Pin diameter scales with daytime population.
          const d = Math.round(Math.max(14, Math.min(32, Math.sqrt(b.est_daytime_pop ?? 0) / 3)));
          return (
            <AdvancedMarker
              key={b.id}
              position={{ lat: b.lat, lng: b.lng }}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              zIndex={selected ? 2 : 1}
              onClick={() => setOpenId(b.id)}
              title={b.name}
            >
              <div
                className="flex items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
                style={{
                  width: d,
                  height: d,
                  background: STAGE_HEX[b.stage],
                  border: selected ? `3px solid ${PRIMARY}` : "2px solid #ffffff",
                }}
              >
                {selected ? stopIdx! + 1 : ""}
              </div>
            </AdvancedMarker>
          );
        })}

        {open && (
          <InfoWindow
            position={{ lat: open.lat!, lng: open.lng! }}
            pixelOffset={[0, -14]}
            onCloseClick={() => setOpenId(null)}
            headerContent={<span className="font-semibold">{open.name}</span>}
          >
            <div className="min-w-44 text-[13px]">
              <div className="text-xs text-slate-500">{open.street_address}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: STAGE_HEX[open.stage] }}
                />
                <span style={{ color: STAGE_HEX[open.stage] }} className="font-medium">
                  {STAGE_LABELS[open.stage]}
                </span>
                {" · "}
                {fmtNumber(open.est_daytime_pop)} daytime pop.
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <Link
                  href={`/buildings/${open.id}`}
                  className="flex items-center gap-1 font-medium text-primary-600"
                >
                  Open
                  <Icon name="arrow-right" size={11} />
                </Link>
                <button
                  onClick={() => onLogVisit(open)}
                  disabled={loggedIds.has(open.id)}
                  className="font-medium text-status-green disabled:opacity-60"
                >
                  {loggedIds.has(open.id) ? "Visit logged" : "Log visit"}
                </button>
                {planMode && (
                  <button
                    onClick={() => onTogglePlanStop(open)}
                    className="font-medium text-primary-600"
                  >
                    {openStopIdx !== undefined
                      ? `Remove (stop ${openStopIdx + 1})`
                      : "+ Add to route"}
                  </button>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
