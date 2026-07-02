"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Building, Contact, EmailTemplate } from "@/lib/types";
import { gmailComposeUrl, mergeTemplate } from "@/lib/format";
import { Modal } from "./ui";

interface Props {
  building: Building;
  contact: Contact;
  onClose: () => void;
  /** Called after the user opens the draft so the touch can be logged. */
  onSent: (subject: string) => void;
}

export default function EmailComposeModal({ building, contact, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [senderName, setSenderName] = useState("");

  useEffect(() => {
    const sb = supabase();
    sb.from("email_templates")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        const t = (data as EmailTemplate[]) ?? [];
        setTemplates(t);
        if (t.length) setTemplateId(t[0].id);
      });
    sb.auth.getUser().then(({ data }) => {
      const u = data.user;
      setSenderName(
        (u?.user_metadata?.full_name as string) ?? u?.email?.split("@")[0] ?? "The PopUp Bagels team"
      );
    });
  }, []);

  const template = templates.find((t) => t.id === templateId) ?? null;
  const subject = useMemo(
    () => (template ? mergeTemplate(template.subject, building, contact, senderName) : ""),
    [template, building, contact, senderName]
  );
  const body = useMemo(
    () => (template ? mergeTemplate(template.body, building, contact, senderName) : ""),
    [template, building, contact, senderName]
  );

  function openDraft(kind: "gmail" | "mailto") {
    const to = contact.email ?? "";
    const url =
      kind === "gmail"
        ? gmailComposeUrl(to, subject, body)
        : `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
    onSent(subject);
  }

  return (
    <Modal title={`Email ${contact.name ?? contact.role}`} onClose={onClose} wide>
      {!contact.email && (
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          No email on file for this contact. The draft opens without a recipient.
        </p>
      )}
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Template</span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {template ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold">{subject}</div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-slate-700">{body}</pre>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">
          No templates yet. Create one on the Templates page.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => openDraft("mailto")}
          disabled={!template}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
        >
          Open in mail app
        </button>
        <button
          onClick={() => openDraft("gmail")}
          disabled={!template}
          className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          Open in Gmail
        </button>
      </div>
    </Modal>
  );
}
