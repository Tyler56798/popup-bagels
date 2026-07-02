/**
 * One-time geocoder: reads building addresses from the legacy dataset and
 * writes data/geocoded.json mapping buildingId -> { lat, lng, displayName }.
 *
 * Uses Nominatim (OpenStreetMap) — free, but rate-limited to 1 req/sec and
 * requires a descriptive User-Agent. ~88 lookups ≈ 2 minutes.
 *
 * Usage: node scripts/geocode.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// data.js assigns to window.POPUP_BAGELS_DATA — shim window and eval it.
const dataSource = ["legacy/data.js", "data.js"]
  .map((p) => path.join(root, p))
  .find((p) => existsSync(p));
if (!dataSource) throw new Error("Could not find data.js");
const window = {};
new Function("window", readFileSync(dataSource, "utf8"))(window);
const buildings = window.POPUP_BAGELS_DATA;

const outPath = path.join(root, "data", "geocoded.json");
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};

const UA = "popup-bagels-lead-manager/1.0 (tylerkhummel@gmail.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${query}`);
  const hits = await res.json();
  return hits[0] ?? null;
}

let done = 0, failed = [];
for (const b of buildings) {
  done++;
  if (existing[b.buildingId]?.lat) continue; // resumable
  const address = `${b.streetAddress}, Chicago, IL ${b.zip}`;
  try {
    let hit = await lookup(address);
    if (!hit) {
      await sleep(1100);
      hit = await lookup(`${b.buildingName}, Chicago, IL`);
    }
    if (hit) {
      existing[b.buildingId] = {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        displayName: hit.display_name,
      };
      console.log(`[${done}/${buildings.length}] ok  ${b.buildingName}`);
    } else {
      failed.push(b.buildingId);
      console.log(`[${done}/${buildings.length}] MISS ${b.buildingName} (${address})`);
    }
  } catch (err) {
    failed.push(b.buildingId);
    console.log(`[${done}/${buildings.length}] ERR ${b.buildingName}: ${err.message}`);
  }
  // Persist as we go so a crash loses nothing.
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(existing, null, 2));
  await sleep(1100);
}

console.log(`\nGeocoded ${Object.keys(existing).length}/${buildings.length}.`);
if (failed.length) console.log("Failed:", failed.join(", "));
