"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  STAGE_LABELS,
  STAGE_COLORS,
  VIABILITY_LABELS,
  VIABILITY_COLORS,
  STAGES,
  type Stage,
  type Viability,
} from "@/lib/types";
import { Icon } from "@/components/icons";

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function ViabilityBadge({ viability }: { viability: Viability | null }) {
  if (!viability) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium ${VIABILITY_COLORS[viability]}`}
    >
      {VIABILITY_LABELS[viability]}
    </span>
  );
}

export function StageSelect({
  value,
  onChange,
  className = "",
}: {
  value: Stage;
  onChange: (s: Stage) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Stage)}
      className={`rounded border border-[#d0d4e4] bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${className}`}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export function ScoreDots({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Lead score ${score}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= score ? "bg-primary-500" : "bg-[#e6e9f2]"}`}
        />
      ))}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#323338]/50 p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-lg border border-[#e6e9f2] bg-white p-6 shadow-xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-chrome hover:text-slate-700"
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Are you sure?" onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded border border-[#d0d4e4] px-4 py-2 text-sm font-medium transition hover:bg-chrome"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded bg-status-red px-4 py-2 text-sm font-medium text-white transition hover:brightness-90"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-[#676879]">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function BuildingLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/buildings/${id}`} className="font-medium text-[#323338] hover:text-primary-600">
      {name}
    </Link>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-slate-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e6e9f2] border-t-primary-500" />
    </div>
  );
}
