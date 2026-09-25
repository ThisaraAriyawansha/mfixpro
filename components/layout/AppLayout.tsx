"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import { useShopName } from "@/hooks/useShopName";

function HeaderClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shrink-0 text-right text-white lg:text-ink text-[11px] sm:text-xs font-poppins tabular-nums leading-tight whitespace-nowrap">
      {now
        ? <>
            <span className="block lg:inline">
              {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="hidden lg:inline"> · </span>
            <span className="block lg:inline">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        :" "}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const shopName = useShopName();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    document.title = `${shopName} POS`;
  }, [shopName]);

  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-zinc-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 py-2 bg-brand lg:bg-white lg:border-b lg:border-zinc-200 shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white lg:hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span className="font-milonga text-white text-base sm:text-lg truncate lg:hidden">{shopName}</span>
          </div>
          <HeaderClock />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
