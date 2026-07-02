import type { Building, Contact } from "./types";

export function fmtNumber(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

export function fmtMoney(n: number | null | undefined): string {
  return n == null
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Local YYYY-MM-DD for <input type="date"> and date-only comparisons. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Fill {{mergeFields}} in an email template from building/contact data. */
export function mergeTemplate(
  text: string,
  building: Building | null,
  contact: Contact | null,
  senderName: string
): string {
  const firstName = contact?.name?.split(/\s+/)[0] ?? "there";
  const fields: Record<string, string> = {
    buildingName: building?.name ?? "[building]",
    buildingAddress: building?.street_address ?? "[address]",
    submarket: building?.submarket ?? "[submarket]",
    estDaytimePop: building?.est_daytime_pop
      ? `~${building.est_daytime_pop.toLocaleString("en-US")}`
      : "thousands of",
    contactName: contact?.name ?? "there",
    contactFirstName: firstName,
    contactTitle: contact?.title ?? "",
    senderName,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => fields[k] ?? `{{${k}}}`);
}

/** Gmail compose deep link (falls back gracefully — it's just a URL). */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const p = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${p.toString()}`;
}

// ---------- CSV ----------

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadFile(filename: string, content: string, mime = "text/csv"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal CSV parser handling quoted fields; returns array of objects keyed by header row. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);

  const [header, ...data] = rows;
  if (!header) return [];
  return data.map((r) =>
    Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] ?? "").trim()]))
  );
}
