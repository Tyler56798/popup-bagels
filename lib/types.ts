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

/** monday-style solid label fills; every stage color carries white text. */
export const STAGE_COLORS: Record<Stage, string> = {
  not_contacted: "bg-status-gray text-white",
  reached_out: "bg-status-blue text-white",
  followed_up: "bg-status-purple text-white",
  booked: "bg-status-green text-white",
  declined: "bg-status-red text-white",
};

export type Viability = "strong" | "acceptable" | "weak" | "not_viable";

export const VIABILITY_LABELS: Record<Viability, string> = {
  strong: "Strong",
  acceptable: "Acceptable",
  weak: "Weak",
  not_viable: "Not Viable",
};

export const VIABILITY_COLORS: Record<Viability, string> = {
  strong: "bg-status-green text-white",
  acceptable: "bg-status-orange text-white",
  weak: "bg-status-red text-white",
  not_viable: "bg-status-gray text-white",
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
  call: { label: "Call", icon: "phone" },
  email: { label: "Email", icon: "mail" },
  visit: { label: "Visit", icon: "walk" },
  note: { label: "Note", icon: "note" },
  stage_change: { label: "Stage change", icon: "shuffle" },
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
  tentative: "bg-status-orange text-white",
  confirmed: "bg-status-blue text-white",
  completed: "bg-status-green text-white",
  cancelled: "bg-status-gray text-white",
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
