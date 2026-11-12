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

// Sizes scale with the screen: widths follow the viewport width (vw),
// heights follow the viewport height (vh). clamp() keeps them within
// sensible limits on very small or very large displays.
const S = {
  pagePad: "clamp(16px, 2vw, 48px)",
  gap: "clamp(10px, 2vh, 26px)",
  bannerPad: "clamp(20px, 3.8vh, 48px) clamp(20px, 2.4vw, 52px)",
  bannerLogo: "clamp(48px, 7vh, 84px)",
  bannerLogoImg: "clamp(26px, 3.9vh, 46px)",
  title: "clamp(24px, 4.2vh, 50px)",
  greet: "clamp(13px, 1.9vh, 20px)",
  sub: "clamp(11px, 1.6vh, 17px)",
  btnText: "clamp(13px, 1.8vh, 18px)",
  cardPadY: "clamp(14px, 3.2vh, 40px)",
  icon: "clamp(34px, 5.6vh, 64px)",
  iconGlyph: "clamp(16px, 2.7vh, 30px)",
  label: "clamp(12px, 1.95vh, 20px)",
  desc: "clamp(10px, 1.55vh, 16px)",
};

export default function HomePage() {
  const { user, can } = useAuth();
  const shopName = useShopName();

  // Every page the user can open, mirroring the sidebar
  const links = filterNav(can)
    .flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
    .filter((link) => link.href !== "/home");

  const firstName = user?.displayName?.split(" ")[0];

  return (
    <div style={{ padding: S.pagePad }}>
      {/* Content takes a percentage of the available width */}
      <div className="w-full xl:w-[97%] mx-auto flex flex-col" style={{ gap: S.gap }}>
        {/* Welcome banner */}
        <div
          className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-white via-white to-brand-light"
          style={{ padding: S.bannerPad }}
        >
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
            className="absolute -right-6 -bottom-10 h-auto opacity-[0.08] pointer-events-none select-none"
            style={{ width: "clamp(170px, 14vw, 280px)" }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center shrink-0"
                style={{ width: S.bannerLogo, height: S.bannerLogo }}
              >
                <Image
                  src="/shop_logo/1_M.png"
                  alt="M-Fixpro"
                  width={64}
                  height={80}
                  className="h-auto"
                  style={{ width: S.bannerLogoImg }}
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="text-zinc-500" style={{ fontSize: S.greet }}>{greeting()} 👋</p>
                <h1 className="font-prata text-ink leading-tight truncate" style={{ fontSize: S.title }}>
                  {firstName ? `Welcome, ${firstName}` : "Welcome back"}
                </h1>
                <p className="text-zinc-400 mt-1 truncate" style={{ fontSize: S.sub }}>
                  {shopName} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" style={{ fontSize: S.btnText }}>
              {can("sales.view") && (
                <Link href="/sales" className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white px-4 py-2.5 shadow-[0_8px_18px_-8px_rgba(227,6,19,0.6)] transition-colors">
                  <Plus size={15} /> New Sale
                </Link>
              )}
              {can("jobs.view") && (
                <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 hover:border-black text-ink px-4 py-2.5 transition-colors">
                  <Wrench size={15} /> New Job
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Shortcut cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7" style={{ gap: S.gap }}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group nexora-card px-2.5 flex flex-col items-center text-center min-w-0 transition-all hover:border-brand/40 hover:shadow-sm"
                style={{ paddingTop: S.cardPadY, paddingBottom: S.cardPadY }}
              >
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-brand group-hover:border-brand"
                  style={{ width: S.icon, height: S.icon }}
                >
                  <Icon
                    className="text-zinc-600 transition-colors group-hover:text-white"
                    style={{ width: S.iconGlyph, height: S.iconGlyph }}
                  />
                </div>
                <p className="font-medium text-ink mt-2 truncate max-w-full" style={{ fontSize: S.label }}>{link.label}</p>
                <p className="text-zinc-400 mt-0.5 truncate max-w-full" style={{ fontSize: S.desc }}>{link.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
