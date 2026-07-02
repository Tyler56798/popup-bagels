/**
 * Seeds Supabase with the 88-building dataset + contacts + starter email templates.
 *
 * Reads:
 *  - legacy/data-private.js  (full dataset with real contact emails/phones — gitignored)
 *    falls back to legacy/data.js (masked) if the private file is missing
 *  - data/geocoded.json      (lat/lng per buildingId)
 *
 * Requires env (from .env.local or the shell):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY   (service role — bypasses RLS; never ship to the browser)
 *
 * Idempotent: upserts buildings by building_key; replaces that building's
 * contacts on each run. Does not touch activities/tasks/events.
 *
 * Usage: npm run seed
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- load .env.local manually (no dotenv dependency) ---
const envPath = path.join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to .env.local (see .env.local.example) and re-run."
  );
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// --- load dataset (private preferred, masked fallback) ---
const dataFile = ["legacy/data-private.js", "legacy/data.js"]
  .map((p) => path.join(root, p))
  .find((p) => existsSync(p));
if (!dataFile) throw new Error("No dataset found in legacy/");
console.log("Dataset:", path.basename(dataFile));
const window = {};
new Function("window", readFileSync(dataFile, "utf8"))(window);
const rows = window.POPUP_BAGELS_DATA;

const geoPath = path.join(root, "data", "geocoded.json");
const geo = existsSync(geoPath) ? JSON.parse(readFileSync(geoPath, "utf8")) : {};

// --- field mapping helpers ---
const yn = (v) => (v === "yes" ? true : v === "no" ? false : null);
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && String(v).trim() !== "" ? n : null;
};
const txt = (v) => (v && String(v).trim() ? String(v).trim() : null);

const STAGE_MAP = {
  "not contacted": "not_contacted",
  "reached out": "reached_out",
  "followed up": "followed_up",
  booked: "booked",
  declined: "declined",
};

function mapBuilding(r) {
  const g = geo[r.buildingId] ?? {};
  return {
    building_key: r.buildingId,
    name: r.buildingName,
    aka: txt(r.alsoKnownAs),
    street_address: r.streetAddress,
    zip: txt(r.zip),
    submarket: txt(r.submarket),
    class_rating: txt(r.classRating),
    office_or_mixed_use: txt(r.officeOrMixedUse),
    multi_tenant: yn(r.multiTenantOffice),
    rentable_sf: num(r.rentableSf),
    num_floors: num(r.numFloors),
    year_built: txt(r.yearBuiltOrRenovated) ?? txt(r.yearBuilt),
    lobby_type: txt(r.lobbyType),
    est_daytime_pop: num(r.estDaytimePopulation),
    owner_entity: txt(r.ownerEntity),
    property_manager: txt(r.propertyManagerFirm),
    in_house_management: yn(r.inHouseManagement),
    leasing_brokerage: txt(r.leasingBrokerage),
    website: txt(r.buildingWebsite),
    tenant_app: txt(r.tenantApp),
    tx_program_name: txt(r.tenantExperienceProgramName),
    viability: txt(r.popUpLobbyViability),
    viability_rationale: txt(r.popUpLobbyViabilityRationale),
    building_status: txt(r.buildingStatus),
    mag_mile: yn(r.magMileCohort) ?? false,
    lobby_activation_history: txt(r.lobbyActivationHistory),
    known_food_vendors: txt(r.knownFoodVendorsOnsite),
    anchor_tenants: txt(r.anchorTenantsTop5),
    industry_mix: txt(r.industryMixSummary),
    lead_score: num(r.leadScore),
    lead_score_rationale: txt(r.leadScoreRationale),
    wave: num(r.wave),
    stage: STAGE_MAP[String(r.outreachStatus ?? "").toLowerCase()] ?? "not_contacted",
    notes: [txt(r.notes), txt(r.notes1b), txt(r.notes1c)].filter(Boolean).join("\n\n") || null,
    lat: g.lat ?? null,
    lng: g.lng ?? null,
  };
}

function mapContacts(r, buildingId) {
  const roles = [
    ["tenant_experience", r.txName, r.txTitle, r.txEmail, r.txEmailStatus, r.txPhone, r.txLinkedinUrl, r.txSource],
    ["general_manager", r.gmName, r.gmTitle, r.gmEmail, r.gmEmailStatus, r.gmPhone, r.gmLinkedinUrl, r.gmSource],
    ["operations", r.opsName, r.opsTitle, r.opsEmail, r.opsEmailStatus, r.opsPhone, r.opsLinkedinUrl, r.opsSource],
  ];
  const out = [];
  for (const [role, name, title, email, emailStatus, phone, linkedin, source] of roles) {
    // Keep the row if we know at least a name, email, or phone.
    if (txt(name) || txt(email) || txt(phone)) {
      out.push({
        building_id: buildingId,
        role,
        name: txt(name),
        title: txt(title),
        email: txt(email),
        email_status: txt(emailStatus),
        phone: txt(phone),
        linkedin_url: txt(linkedin),
        source: txt(source),
        is_primary: out.length === 0,
      });
    }
  }
  // Building-level phone/emails as an "other" catch-all contact.
  if (txt(r.mainManagementPhone) || txt(r.generalInfoEmail)) {
    out.push({
      building_id: buildingId,
      role: "property_manager",
      name: txt(r.propertyManagerFirm) ?? "Management office",
      title: "Main management office",
      email: txt(r.generalInfoEmail),
      email_status: txt(r.generalInfoEmail) ? "generic_inbox" : null,
      phone: txt(r.mainManagementPhone),
      source: "building dataset",
      is_primary: out.length === 0,
    });
  }
  return out;
}

const TEMPLATES = [
  {
    name: "Cold intro — tenant experience",
    subject: "Bagel pop-up for {{buildingName}} tenants?",
    body: `Hi {{contactFirstName}},

I'm {{senderName}} with PopUp Bagels — we run short morning bagel pop-ups inside office buildings, and {{buildingName}} is exactly the kind of building our tenants love us in ({{estDaytimePop}} people in the building on a weekday is a lot of breakfasts).

We handle everything: insurance (COI to your spec), a tight 7–10am window, and a footprint that fits a lobby corner. Buildings use us as a zero-cost tenant-experience perk — tenants pay, the building just hosts.

Would you be open to a 15-minute call this week to see if it fits {{buildingName}}'s activation calendar?

{{senderName}}
PopUp Bagels — Chicago`,
  },
  {
    name: "Follow-up nudge",
    subject: "Re: Bagel pop-up at {{buildingName}}",
    body: `Hi {{contactFirstName}},

Just floating this back to the top of your inbox — we'd still love to bring a PopUp Bagels morning to {{buildingName}}. We're booking our next wave of Chicago buildings now and can share a one-pager plus COI in advance.

Any interest in a quick call?

{{senderName}}`,
  },
  {
    name: "Booked — logistics confirmation",
    subject: "PopUp Bagels at {{buildingName}} — logistics",
    body: `Hi {{contactFirstName}},

Great news — locking in our pop-up at {{buildingName}}. To confirm logistics:

• Date/time: [DATE], 7:00–10:00am
• Location: [lobby location]
• Load-in: [time / dock / elevator]
• COI: sending to your spec — who should it name?

Anything else your building needs from us (security list, vendor forms), just say the word.

{{senderName}}
PopUp Bagels — Chicago`,
  },
];

// --- run ---
console.log(`Seeding ${rows.length} buildings…`);
let contactCount = 0;
for (const r of rows) {
  const b = mapBuilding(r);
  const { data: building, error } = await supabase
    .from("buildings")
    .upsert(b, { onConflict: "building_key" })
    .select("id")
    .single();
  if (error) {
    console.error(`FAILED ${b.building_key}:`, error.message);
    process.exit(1);
  }
  const contacts = mapContacts(r, building.id);
  await supabase.from("contacts").delete().eq("building_id", building.id);
  if (contacts.length) {
    const { error: cErr } = await supabase.from("contacts").insert(contacts);
    if (cErr) {
      console.error(`contacts FAILED ${b.building_key}:`, cErr.message);
      process.exit(1);
    }
    contactCount += contacts.length;
  }
}
console.log(`Buildings seeded. ${contactCount} contacts inserted.`);

const { count } = await supabase
  .from("email_templates")
  .select("*", { count: "exact", head: true });
if (!count) {
  const { error: tErr } = await supabase.from("email_templates").insert(TEMPLATES);
  if (tErr) console.error("templates FAILED:", tErr.message);
  else console.log(`${TEMPLATES.length} starter email templates inserted.`);
} else {
  console.log("Email templates already present — skipped.");
}
console.log("Done.");
