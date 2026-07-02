"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Building, EmailTemplate } from "@/lib/types";
import { mergeTemplate } from "@/lib/format";
import { ConfirmDialog, Modal, PageHeader, Spinner } from "@/components/ui";

const MERGE_FIELDS = [
  "{{buildingName}}",
  "{{buildingAddress}}",
  "{{submarket}}",
  "{{estDaytimePop}}",
  "{{contactName}}",
  "{{contactFirstName}}",
  "{{contactTitle}}",
  "{{senderName}}",
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [sample, setSample] = useState<Building | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null | "new">(null);
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    const sb = supabase();
    sb.from("email_templates")
      .select("*")
      .order("created_at")
      .then(({ data }) => setTemplates((data as EmailTemplate[]) ?? []));
    sb.from("buildings")
      .select("*")
      .order("lead_score", { ascending: false })
      .limit(1)
      .then(({ data }) => setSample((data?.[0] as Building) ?? null));
  }, []);

  if (!templates) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Email templates"
        sub="Merge fields fill in automatically when you email a contact from a building page."
      >
        <button
          onClick={() => setEditing("new")}
          className="rounded bg-primary-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          + New template
        </button>
      </PageHeader>

      <p className="mb-4 text-xs text-slate-500">
        Available fields:{" "}
        {MERGE_FIELDS.map((f) => (
          <code key={f} className="mr-1.5 rounded bg-slate-200/70 px-1.5 py-0.5">
            {f}
          </code>
        ))}
      </p>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          No templates yet. Run the seed script or create one.
        </p>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <section key={t.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Subject:</span>{" "}
                    {sample ? mergeTemplate(t.subject, sample, null, "You") : t.subject}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setEditing(t)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(t)}
                    className="rounded border border-[#f0c2ca] px-3 py-1.5 text-sm font-medium text-status-red transition hover:bg-[#fdf1f3]"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-primary-600">
                  Preview{sample ? ` (filled with ${sample.name})` : ""}
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-4 font-sans text-sm text-slate-700">
                  {sample ? mergeTemplate(t.body, sample, null, "You") : t.body}
                </pre>
              </details>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <TemplateFormModal
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setTemplates(
              editing === "new" ? [...templates, t] : templates.map((x) => (x.id === t.id ? t : x))
            );
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`Delete the "${deleting.name}" template?`}
          onConfirm={async () => {
            await supabase().from("email_templates").delete().eq("id", deleting.id);
            setTemplates(templates.filter((x) => x.id !== deleting.id));
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function TemplateFormModal({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: (t: EmailTemplate) => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError("Name, subject, and body are all required.");
      return;
    }
    setBusy(true);
    const payload = { name: name.trim(), subject: subject.trim(), body };
    const sb = supabase();
    const q = template
      ? sb.from("email_templates").update(payload).eq("id", template.id)
      : sb.from("email_templates").insert(payload);
    const { data, error: err } = await q.select("*").single();
    setBusy(false);
    if (err) setError(err.message);
    else onSaved(data as EmailTemplate);
  }

  const input =
    "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none";

  return (
    <Modal title={template ? "Edit template" : "New template"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Template name</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Subject</span>
          <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Body</span>
          <textarea
            className={`${input} font-mono`}
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
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
            {busy ? "Saving…" : "Save template"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
