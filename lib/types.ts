export type Stage =
  | "not_contacted"
  | "reached_out"
  | "followed_up"
  | "booked"
  | "declined";

export const STAGES: Stage[] = [
  "not_contacted",
  "reached_out",
  "followed_up",
  "booked",
  "declined",
];

export const STAGE_LABELS: Record<Stage, string> = {
  not_contacted: "Not Contacted",
  reached_out: "Reached Out",
  followed_up: "Followed Up",
  booked: "Booked",
  declined: "Declined",
};

export const STAGE_COLORS: Record<Stage, string> = {
  not_contacted: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  reached_out: "bg-sky-50 text-sky-700 ring-sky-200",
  followed_up: "bg-violet-50 text-violet-700 ring-violet-200",
  booked: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  declined: "bg-rose-50 text-rose-600 ring-rose-200",
};

export type Viability = "strong" | "acceptable" | "weak" | "not_viable";

export const VIABILITY_LABELS: Record<Viability, string> = {
  strong: "Strong",
  acceptable: "Acceptable",
  weak: "Weak",
  not_viable: "Not Viable",
};

export const VIABILITY_COLORS: Record<Viability, string> = {
  strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  acceptable: "bg-amber-50 text-amber-700 ring-amber-200",
  weak: "bg-orange-50 text-orange-600 ring-orange-200",
  not_viable: "bg-rose-50 text-rose-600 ring-rose-200",
};

export type ContactRole =
  | "tenant_experience"
  | "general_manager"
  | "operations"
  | "property_manager"
  | "leasing"
  | "security"
  | "other";

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  tenant_experience: "Tenant Experience",
  general_manager: "General Manager",
  operations: "Operations",
  property_manager: "Property Mgmt Office",
  leasing: "Leasing",
  security: "Security",
  other: "Other",
};

export type ActivityType = "call" | "email" | "visit" | "note" | "stage_change";

export const ACTIVITY_TYPE_META: Record<ActivityType, { label: string; icon: string }> = {
  call: { label: "Call", icon: "📞" },
  email: { label: "Email", icon: "✉️" },
  visit: { label: "Visit", icon: "🚶" },
  note: { label: "Note", icon: "📝" },
  stage_change: { label: "Stage change", icon: "🔀" },
};

export type EventStatus = "tentative" | "confirmed" | "completed" | "cancelled";
export type CoiStatus = "not_needed" | "pending" | "submitted" | "approved";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  tentative: "Tentative",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  tentative: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export const COI_STATUS_LABELS: Record<CoiStatus, string> = {
  not_needed: "Not needed",
  pending: "Pending",
  submitted: "Submitted",
  approved: "Approved",
};

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export interface Building {
  id: string;
  building_key: string;
  name: string;
  aka: string | null;
  street_address: string;
  zip: string | null;
  submarket: string | null;
  class_rating: string | null;
  office_or_mixed_use: string | null;
  multi_tenant: boolean | null;
  rentable_sf: number | null;
  num_floors: number | null;
  year_built: string | null;
  lobby_type: string | null;
  est_daytime_pop: number | null;
  owner_entity: string | null;
  property_manager: string | null;
  in_house_management: boolean | null;
  leasing_brokerage: string | null;
  website: string | null;
  tenant_app: string | null;
  tx_program_name: string | null;
  viability: Viability | null;
  viability_rationale: string | null;
  building_status: string | null;
  mag_mile: boolean;
  lobby_activation_history: string | null;
  known_food_vendors: string | null;
  anchor_tenants: string | null;
  industry_mix: string | null;
  lead_score: number | null;
  lead_score_rationale: string | null;
  wave: number | null;
  stage: Stage;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  building_id: string;
  role: ContactRole;
  name: string | null;
  title: string | null;
  email: string | null;
  email_status: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  building_id: string;
  contact_id: string | null;
  user_id: string | null;
  type: ActivityType;
  summary: string;
  occurred_at: string;
  created_at: string;
}

export interface Task {
  id: string;
  building_id: string | null;
  user_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  status: "open" | "done";
  created_at: string;
  completed_at: string | null;
}

export interface PopupEvent {
  id: string;
  building_id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  location_note: string | null;
  load_in_notes: string | null;
  coi_status: CoiStatus;
  revenue: number | null;
  units_sold: number | null;
  result_notes: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface StageChange {
  id: string;
  building_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  changed_by: string | null;
  changed_at: string;
}

/** Days without contact before a reached-out/followed-up lead counts as stale. */
export const FOLLOW_UP_DAYS = 7;
