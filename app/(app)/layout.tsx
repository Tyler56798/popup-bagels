"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BagelMark, Icon, type IconName } from "@/components/icons";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/buildings", label: "Buildings", icon: "building" },
  { href: "/pipeline", label: "Pipeline", icon: "board" },
  { href: "/map", label: "Map", icon: "pin" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
  { href: "/templates", label: "Templates", icon: "mail" },
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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#e6e9f2] bg-chrome lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <BagelMark />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-[#323338]">PopUp Bagels</div>
            <div className="text-[11px] font-medium text-[#676879]">Growth CRM</div>
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition ${
                  active
                    ? "bg-primary-100 font-medium text-primary-600"
                    : "text-[#323338] hover:bg-[#eceef5]"
                }`}
              >
                <Icon name={item.icon} className={active ? "" : "text-[#676879]"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[#e6e9f2] bg-white px-4 lg:px-6">
          {/* Mobile brand (sidebar is hidden) */}
          <div className="flex items-center gap-2 lg:hidden">
            <BagelMark size={24} />
            <span className="text-sm font-semibold text-[#323338]">PopUp Bagels</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-[#676879] sm:inline">{email ?? ""}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
              {(email ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <button
              onClick={signOut}
              className="rounded border border-[#d0d4e4] px-2.5 py-1 text-xs font-medium text-[#323338] transition hover:bg-chrome"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-8">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e6e9f2] bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-primary-600" : "text-[#676879]"
              }`}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
