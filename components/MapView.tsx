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
import { STAGE_LABELS, type Building, type Stage } from "@/lib/types";
import { fmtNumber } from "@/lib/format";

export const STAGE_HEX: Record<Stage, string> = {
  not_contacted: "#78716c",
  reached_out: "#0284c7",
  followed_up: "#7c3aed",
  booked: "#059669",
  declined: "#e11d48",
};

const CHICAGO_CENTER = { lat: 41.8832, lng: -87.6324 };

interface Props {
  buildings: Building[];
  planMode: boolean;
  route: Building[];
  onTogglePlanStop: (b: Building) => void;
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
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeWeight: 3, strokeColor: "#f28c0f" },
          offset: "0",
          repeat: "14px",
        },
      ],
    });
    return () => line.setMap(null);
  }, [map, path]);

  return null;
}

export default function MapView({ buildings, planMode, route, onTogglePlanStop }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-stone-50 p-8">
        <div className="max-w-md text-center text-sm text-stone-600">
          <div className="text-3xl">🗺️</div>
          <h2 className="mt-2 font-semibold text-stone-800">Google Maps key needed</h2>
          <p className="mt-2">
            Add <code className="rounded bg-stone-200 px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            to <code className="rounded bg-stone-200 px-1 py-0.5 text-xs">.env.local</code> and reload.
            Create the key at console.cloud.google.com → APIs &amp; Services → Credentials, with the
            “Maps JavaScript API” enabled.
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
        mapId="POPUP_BAGELS_CRM" /* any ID enables Advanced Markers; make a styled one in the console later if wanted */
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
                  border: selected ? "3px solid #f28c0f" : "2px solid #ffffff",
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
              <div className="text-xs text-stone-500">{open.street_address}</div>
              <div className="mt-1 text-xs">
                <span style={{ color: STAGE_HEX[open.stage] }} className="font-medium">
                  ● {STAGE_LABELS[open.stage]}
                </span>
                {" · "}
                {fmtNumber(open.est_daytime_pop)} daytime pop.
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <Link href={`/buildings/${open.id}`} className="font-medium text-brand-600">
                  Open →
                </Link>
                {planMode && (
                  <button
                    onClick={() => onTogglePlanStop(open)}
                    className="font-medium text-brand-600"
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
