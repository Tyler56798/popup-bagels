"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/buildings", label: "Buildings", icon: "🏢" },
  { href: "/pipeline", label: "Pipeline", icon: "☰" },
  { href: "/map", label: "Map", icon: "📍" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/templates", label: "Templates", icon: "✉️" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await supabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-ink-950 text-stone-300">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">🥯</span>
          <div className="leading-tight">
            <div className="font-semibold text-stone-100">PopUp Bagels</div>
            <div className="text-[11px] uppercase tracking-widest text-brand-400">Growth CRM</div>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-ink-800 font-medium text-brand-300"
                    : "hover:bg-ink-900 hover:text-stone-100"
                }`}
              >
                <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-800 px-5 py-4 text-xs">
          <div className="truncate text-stone-400">{email ?? "…"}</div>
          <button
            onClick={signOut}
            className="mt-1 font-medium text-stone-300 transition hover:text-brand-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-56 min-h-screen flex-1 p-8">{children}</main>
    </div>
  );
}
