"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  ACTIVITY_TYPE_META,
  CONTACT_ROLE_LABELS,
  COI_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  type Activity,
  type ActivityType,
  type Building,
  type Contact,
  type ContactRole,
  type PopupEvent,
  type Stage,
  type Task,
} from "@/lib/types";
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, todayStr } from "@/lib/format";
import {
  ConfirmDialog,
  Modal,
  ScoreDots,
  Spinner,
  StageSelect,
  ViabilityBadge,
} from "@/components/ui";
import BuildingFormModal from "@/components/BuildingFormModal";
import EventFormModal from "@/components/EventFormModal";
import EmailComposeModal from "@/components/EmailComposeModal";
import { Icon, type IconName } from "@/components/icons";

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none";

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [building, setBuilding] = useState<Building | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<PopupEvent[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null | "new">(null);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [eventModal, setEventModal] = useState<PopupEvent | null | "new">(null);

  useEffect(() => {
    const sb = supabase();
    sb.from("buildings")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => (data ? setBuilding(data as Building) : setNotFound(true)));
    sb.from("contacts")
      .select("*")
      .eq("building_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at")
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
    sb.from("activities")
      .select("*")
      .eq("building_id", id)
      .order("occurred_at", { ascending: false })
      .then(({ data }) => setActivities((data as Activity[]) ?? []));
    sb.from("tasks")
      .select("*")
      .eq("building_id", id)
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => setTasks((data as Task[]) ?? []));
    sb.from("events")
      .select("*")
      .eq("building_id", id)
      .order("event_date", { ascending: false })
      .then(({ data }) => setEvents((data as PopupEvent[]) ?? []));
  }, [id]);

  async function changeStage(stage: Stage) {
    if (!building) return;
    const prev = building.stage;
    setBuilding({ ...building, stage });
    const { error } = await supabase().from("buildings").update({ stage }).eq("id", id);
    if (error) setBuilding({ ...building, stage: prev });
  }

  async function deleteBuilding() {
    await supabase().from("buildings").delete().eq("id", id);
    router.push("/buildings");
  }

  async function logActivity(type: ActivityType, summary: string, contactId: string | null) {
    const { data, error } = await supabase()
      .from("activities")
      .insert({ building_id: id, contact_id: contactId, type, summary })
      .select("*")
      .single();
    if (!error && data) {
      setActivities([data as Activity, ...activities]);
      if (type !== "note" && building)
        setBuilding({ ...building, last_contacted_at: (data as Activity).occurred_at });
    }
  }

  if (notFound)
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        Building not found. It may have been deleted.
      </p>
    );
  if (!building) return <Spinner />;

  const facts: [string, React.ReactNode][] = [
    ["Class", building.class_rating ?? "—"],
    ["Floors", fmtNumber(building.num_floors)],
    ["Rentable SF", fmtNumber(building.rentable_sf)],
    ["Daytime population", fmtNumber(building.est_daytime_pop)],
    ["Lobby type", building.lobby_type?.replace(/_/g, " ") ?? "—"],
    ["Year built", building.year_built ?? "—"],
    ["Owner", building.owner_entity ?? "—"],
    ["Property manager", building.property_manager ?? "—"],
    ["Leasing brokerage", building.leasing_brokerage ?? "—"],
    ["Tenant app", building.tenant_app ?? "—"],
    ["TX program", building.tx_program_name ?? "—"],
    ["Outreach wave", building.wave != null ? `Wave ${building.wave}` : "—"],
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{building.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {building.street_address}
            {building.zip ? `, Chicago, IL ${building.zip}` : ""} · {building.submarket ?? "—"}
            {building.mag_mile && (
              <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                Mag Mile
              </span>
            )}
          </p>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
            <ScoreDots score={building.lead_score} />
            <ViabilityBadge viability={building.viability} />
            {building.website && (
              <a
                href={building.website}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline"
              >
                <span className="inline-flex items-center gap-1">
                  Website
                  <Icon name="external" size={12} />
                </span>
              </a>
            )}
            <span className="text-xs text-slate-400">
              Last touch: {building.last_contacted_at ? fmtDateTime(building.last_contacted_at) : "never"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StageSelect value={building.stage} onChange={changeStage} />
          <button
            onClick={() => setShowEdit(true)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded border border-[#f0c2ca] bg-white px-3 py-1.5 text-sm font-medium text-status-red transition hover:bg-[#fdf1f3]"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: building intel */}
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Building intel</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-400">{k}</dt>
                  <dd className="text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            {building.viability_rationale && (
              <div className="mt-4 rounded bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Why this viability: </span>
                {building.viability_rationale}
              </div>
            )}
            {building.lobby_activation_history && (
              <div className="mt-2 rounded bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Activation history: </span>
                {building.lobby_activation_history}
              </div>
            )}
            {building.anchor_tenants && (
              <div className="mt-2 rounded bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Anchor tenants: </span>
                {building.anchor_tenants}
              </div>
            )}
            {building.notes && (
              <div className="mt-2 whitespace-pre-wrap rounded bg-primary-50 p-3 text-xs text-slate-700 ring-1 ring-primary-100">
                {building.notes}
              </div>
            )}
          </section>

          {/* Contacts */}
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Contacts</h2>
              <button
                onClick={() => setEditContact("new")}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                + Add
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No contacts yet.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((c) => (
                  <li key={c.id} className="rounded border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {c.name ?? <span className="text-slate-400">Name unknown</span>}
                          {c.is_primary && (
                            <span className="ml-2 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {CONTACT_ROLE_LABELS[c.role]}
                          {c.title ? ` · ${c.title}` : ""}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                          {c.email && (
                            <div className="flex items-center gap-1.5">
                              <Icon name="mail" size={12} className="text-slate-400" />
                              <a href={`mailto:${c.email}`} className="text-primary-600 hover:underline">
                                {c.email}
                              </a>
                              {c.email_status && c.email_status !== "verified" && (
                                <span className="ml-1 text-[10px] text-status-orange">
                                  ({c.email_status.replace(/_/g, " ")})
                                </span>
                              )}
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <Icon name="phone" size={12} className="text-slate-400" />
                              <a
                                href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                                className="text-primary-600 hover:underline"
                              >
                                {c.phone}
                              </a>
                            </div>
                          )}
                          {c.linkedin_url && (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary-600 hover:underline"
                            >
                              <span className="inline-flex items-center gap-1">
                                LinkedIn
                                <Icon name="external" size={11} />
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                          onClick={() => setEmailContact(c)}
                          className="rounded bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-600"
                        >
                          Email
                        </button>
                        <button
                          onClick={() => setEditContact(c)}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          edit
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right columns: outreach work */}
        <div className="space-y-6 lg:col-span-2">
          <ActivityLog
            activities={activities}
            contacts={contacts}
            onLog={logActivity}
            onDelete={async (aid) => {
              await supabase().from("activities").delete().eq("id", aid);
              setActivities(activities.filter((a) => a.id !== aid));
            }}
          />

          <TaskSection tasks={tasks} setTasks={setTasks} buildingId={id} />

          {/* Events */}
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Pop-up events</h2>
              <button
                onClick={() => setEventModal("new")}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                + Schedule
              </button>
            </div>
            {events.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No pop-ups scheduled here yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex cursor-pointer items-center justify-between gap-3 py-3 transition hover:bg-slate-50"
                    onClick={() => setEventModal(ev)}
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {fmtDate(ev.event_date)}
                        {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}–${ev.end_time?.slice(0, 5) ?? "?"}` : ""}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ev.location_note ?? ev.title} · COI: {COI_STATUS_LABELS[ev.coi_status]}
                        {ev.status === "completed" && ev.revenue != null && (
                          <span className="ml-1 font-medium text-status-green">
                            · {fmtMoney(ev.revenue)}
                            {ev.units_sold != null ? ` / ${fmtNumber(ev.units_sold)} bagels` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded px-2.5 py-0.5 text-xs font-medium ${EVENT_STATUS_COLORS[ev.status]}`}
                    >
                      {EVENT_STATUS_LABELS[ev.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <BuildingFormModal
          building={building}
          onClose={() => setShowEdit(false)}
          onSaved={(b) => {
            setBuilding(b);
            setShowEdit(false);
          }}
        />
      )}
      {showDelete && (
        <ConfirmDialog
          message={`Delete ${building.name} and all of its contacts, activity, tasks, and events? This can't be undone.`}
          onConfirm={deleteBuilding}
          onCancel={() => setShowDelete(false)}
        />
      )}
      {editContact && (
        <ContactFormModal
          buildingId={id}
          contact={editContact === "new" ? null : editContact}
          onClose={() => setEditContact(null)}
          onSaved={(c, deleted) => {
            setContacts(
              deleted
                ? contacts.filter((x) => x.id !== c.id)
                : editContact === "new"
                  ? [...contacts, c]
                  : contacts.map((x) => (x.id === c.id ? c : x))
            );
            setEditContact(null);
          }}
        />
      )}
      {emailContact && (
        <EmailComposeModal
          building={building}
          contact={emailContact}
          onClose={() => setEmailContact(null)}
          onSent={(subject) => {
            logActivity("email", `Sent "${subject}" to ${emailContact.name ?? "contact"}`, emailContact.id);
            setEmailContact(null);
          }}
        />
      )}
      {eventModal && (
        <EventFormModal
          event={eventModal === "new" ? null : eventModal}
          buildingId={id}
          onClose={() => setEventModal(null)}
          onSaved={(ev) => {
            setEvents(
              eventModal === "new"
                ? [ev, ...events]
                : events.map((x) => (x.id === ev.id ? ev : x))
            );
            setEventModal(null);
          }}
          onDeleted={(eid) => {
            setEvents(events.filter((x) => x.id !== eid));
            setEventModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Activity log ---------------- */

function ActivityLog({
  activities,
  contacts,
  onLog,
  onDelete,
}: {
  activities: Activity[];
  contacts: Contact[];
  onLog: (type: ActivityType, summary: string, contactId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [type, setType] = useState<ActivityType>("call");
  const [summary, setSummary] = useState("");
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setBusy(true);
    await onLog(type, summary.trim(), contactId || null);
    setSummary("");
    setBusy(false);
  }

  const contactName = (cid: string | null) =>
    contacts.find((c) => c.id === cid)?.name ?? null;

  // One-tap outcomes for logging from a phone between stops.
  const quickLogs: { type: ActivityType; label: string }[] = [
    { type: "call", label: "No answer" },
    { type: "call", label: "Left voicemail" },
    { type: "call", label: "Spoke to contact" },
    { type: "visit", label: "Visited lobby" },
    { type: "visit", label: "Left samples" },
    { type: "visit", label: "Talked to front desk" },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">Outreach timeline</h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quickLogs.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => {
              setType(q.type);
              setSummary(q.label);
            }}
            className="rounded-full border border-[#d0d4e4] bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-primary-400 hover:text-primary-600"
          >
            {q.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {(["call", "email", "visit", "note"] as ActivityType[]).map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">No specific contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? CONTACT_ROLE_LABELS[c.role]}
            </option>
          ))}
        </select>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What happened? e.g. Left voicemail with GM about March pop-up"
          className="min-w-48 flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !summary.trim()}
          className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          Log
        </button>
      </form>

      {activities.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          No outreach logged yet. Every call, email, and lobby visit goes here.
        </p>
      ) : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
          {activities.map((a) => (
            <li key={a.id} className="group relative">
              <span
                className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-300"
                title={ACTIVITY_TYPE_META[a.type].label}
              >
                <Icon name={ACTIVITY_TYPE_META[a.type].icon as IconName} size={10} />
              </span>
              <div className="text-sm text-slate-800">{a.summary}</div>
              <div className="text-xs text-slate-400">
                {fmtDateTime(a.occurred_at)}
                {contactName(a.contact_id) ? ` · ${contactName(a.contact_id)}` : ""}
                <button
                  onClick={() => onDelete(a.id)}
                  className="ml-2 hidden text-slate-400 hover:text-status-red group-hover:inline"
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ---------------- Tasks ---------------- */

function TaskSection({
  tasks,
  setTasks,
  buildingId,
}: {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  buildingId: string;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data, error } = await supabase()
      .from("tasks")
      .insert({ building_id: buildingId, title: title.trim(), due_date: due || null })
      .select("*")
      .single();
    if (!error && data) {
      setTasks([...tasks, data as Task]);
      setTitle("");
      setDue("");
    }
  }

  async function toggle(t: Task) {
    const status = t.status === "open" ? "done" : "open";
    const completed_at = status === "done" ? new Date().toISOString() : null;
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, status, completed_at } : x)));
    await supabase().from("tasks").update({ status, completed_at }).eq("id", t.id);
  }

  async function remove(t: Task) {
    setTasks(tasks.filter((x) => x.id !== t.id));
    await supabase().from("tasks").delete().eq("id", t.id);
  }

  const today = todayStr();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">Tasks</h2>
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Follow up with the GM about…"
          className="min-w-48 flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {tasks.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-400">No tasks for this building.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={t.status === "done"}
                onChange={() => toggle(t)}
                className="h-4 w-4 accent-primary-500"
              />
              <span className={t.status === "done" ? "text-slate-400 line-through" : ""}>
                {t.title}
              </span>
              {t.due_date && (
                <span
                  className={`text-xs ${
                    t.status === "open" && t.due_date < today ? "font-medium text-status-red" : "text-slate-400"
                  }`}
                >
                  {fmtDate(t.due_date)}
                </span>
              )}
              <button
                onClick={() => remove(t)}
                className="ml-auto hidden text-xs text-slate-400 hover:text-status-red group-hover:inline"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Contact form ---------------- */

function ContactFormModal({
  buildingId,
  contact,
  onClose,
  onSaved,
}: {
  buildingId: string;
  contact: Contact | null;
  onClose: () => void;
  onSaved: (c: Contact, deleted?: boolean) => void;
}) {
  const editing = !!contact;
  const [f, setF] = useState({
    role: contact?.role ?? ("other" as ContactRole),
    name: contact?.name ?? "",
    title: contact?.title ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    linkedin_url: contact?.linkedin_url ?? "",
    notes: contact?.notes ?? "",
    is_primary: contact?.is_primary ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({
        ...f,
        [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
      });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() && !f.email.trim() && !f.phone.trim()) {
      setError("At least a name, email, or phone is required.");
      return;
    }
    setBusy(true);
    const payload = {
      building_id: buildingId,
      role: f.role,
      name: f.name.trim() || null,
      title: f.title.trim() || null,
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      linkedin_url: f.linkedin_url.trim() || null,
      notes: f.notes.trim() || null,
      is_primary: f.is_primary,
    };
    const sb = supabase();
    const q = editing
      ? sb.from("contacts").update(payload).eq("id", contact!.id)
      : sb.from("contacts").insert(payload);
    const { data, error: err } = await q.select("*").single();
    setBusy(false);
    if (err) setError(err.message);
    else onSaved(data as Contact);
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    await supabase().from("contacts").delete().eq("id", contact!.id);
    onSaved(contact!, true);
  }

  return (
    <Modal title={editing ? "Edit contact" : "Add contact"} onClose={onClose}>
      <form onSubmit={save}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select className={input} value={f.role} onChange={set("role")}>
              {Object.entries(CONTACT_ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input className={input} value={f.name} onChange={set("name")} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
            <input className={input} value={f.title} onChange={set("title")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input className={input} type="email" value={f.email} onChange={set("email")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <input className={input} value={f.phone} onChange={set("phone")} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">LinkedIn URL</span>
            <input className={input} value={f.linkedin_url} onChange={set("linkedin_url")} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea className={input} rows={2} value={f.notes} onChange={set("notes")} />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.is_primary} onChange={set("is_primary")} />
            <span className="text-sm font-medium text-slate-700">Primary contact</span>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-status-red">{error}</p>}
        <div className="mt-5 flex items-center justify-between">
          {editing ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-sm font-medium text-status-red hover:underline"
            >
              Delete contact
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
