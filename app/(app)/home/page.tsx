"use client";
import Link from "next/link";
import Image from "next/image";
import { Plus, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShopName } from "@/hooks/useShopName";
import { filterNav, isGroup } from "@/lib/nav";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { user, can } = useAuth();
  const shopName = useShopName();

  // Every page the user can open, mirroring the sidebar
  const links = filterNav(can)
    .flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
    .filter((link) => link.href !== "/home");

  const firstName = user?.displayName?.split(" ")[0];

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-white via-white to-brand-light p-6 sm:p-8">
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#e4e4e7 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "linear-gradient(to left, black, transparent 70%)",
              WebkitMaskImage: "linear-gradient(to left, black, transparent 70%)",
            }}
          />
          <Image
            src="/shop_logo/1_M.png"
            alt=""
            width={300}
            height={380}
            className="absolute -right-6 -bottom-10 w-44 sm:w-56 h-auto opacity-[0.08] pointer-events-none select-none"
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center shrink-0">
                <Image src="/shop_logo/1_M.png" alt="M-Fixpro" width={64} height={80} className="w-8 h-auto" priority />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-zinc-500">{greeting()} 👋</p>
                <h1 className="font-prata text-2xl sm:text-3xl text-ink leading-tight truncate">
                  {firstName ? `Welcome, ${firstName}` : "Welcome back"}
                </h1>
                <p className="text-zinc-400 text-xs mt-1 truncate">
                  {shopName} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {can("sales.view") && (
                <Link href="/sales" className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm px-4 py-2.5 shadow-[0_8px_18px_-8px_rgba(227,6,19,0.6)] transition-colors">
                  <Plus size={15} /> New Sale
                </Link>
              )}
              {can("jobs.view") && (
                <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 hover:border-black text-ink text-sm px-4 py-2.5 transition-colors">
                  <Wrench size={15} /> New Job
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Shortcut cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group nexora-card px-2.5 py-4 flex flex-col items-center text-center min-w-0 transition-all hover:border-brand/40 hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-brand group-hover:border-brand">
                  <Icon size={17} className="text-zinc-600 transition-colors group-hover:text-white" />
                </div>
                <p className="text-[13px] font-medium text-ink mt-2 truncate max-w-full">{link.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-full">{link.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
