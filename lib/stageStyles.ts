import type { Stage } from "@/lib/types";

/** Tailwind bg-* classes for stage indicator dots (same hues as the solid stage labels). */
export const STAGE_DOT_BG: Record<Stage, string> = {
  not_contacted: "bg-status-gray",
  reached_out: "bg-status-blue",
  followed_up: "bg-status-purple",
  booked: "bg-status-green",
  declined: "bg-status-red",
};

/** Raw hex values for canvas/SVG surfaces (map pins) — keep in sync with globals.css. */
export const STAGE_HEX: Record<Stage, string> = {
  not_contacted: "#676879",
  reached_out: "#1f76db",
  followed_up: "#7c3aed",
  booked: "#00854d",
  declined: "#ca3a52",
};
