"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { BagelMark } from "@/components/icons";

/**
 * Sign-in only: accounts are created by invitation (Supabase dashboard "Invite user"),
 * never self-serve. Invited users land with a session and set their password at /set-password.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Invite/recovery emails land here with a token in the URL (middleware bounces
  // cookieless requests to /login). The browser client exchanges it on creation;
  // once the session exists, send the new user to set their password.
  useEffect(() => {
    const url = window.location.href;
    if (!url.includes("code=") && !url.includes("access_token")) return;
    const sb = supabase();
    const check = () =>
      sb.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/set-password");
          return true;
        }
        return false;
      });
    check();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/set-password");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      router.push("/");
      router.refresh();
    }
    setBusy(false);
  }

  const input =
    "w-full rounded border border-[#d0d4e4] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <main className="flex min-h-screen items-center justify-center bg-chrome p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <BagelMark size={48} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#323338]">
            PopUp Bagels <span className="text-primary-500">Growth CRM</span>
          </h1>
          <p className="mt-1 text-sm text-[#676879]">Chicago office-building outreach</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-[#e6e9f2] bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="you@popupbagels.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-xs text-[#676879]">
            Access is by invitation. Ask your admin for an invite email.
          </p>
        </form>
      </div>
    </main>
  );
}
