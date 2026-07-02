"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.updateUser({
      password,
      ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
    });
    setBusy(false);
    if (error) setError(error.message);
    else {
      router.push("/");
      router.refresh();
    }
  }

  const input =
    "w-full rounded border border-[#d0d4e4] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <div className="max-w-md">
      <PageHeader
        title="Set your password"
        sub="Choose the password you'll use to sign in from now on."
      />
      <form
        onSubmit={submit}
        className="space-y-4 rounded-lg border border-[#e6e9f2] bg-white p-6"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Your name <span className="font-normal text-slate-400">(shown on outreach you log)</span>
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={input}
            placeholder="First Last"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">New password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Confirm password</span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </label>

        {error && <p className="text-sm text-status-red">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
