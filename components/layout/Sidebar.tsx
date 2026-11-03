"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useShopName } from "@/hooks/useShopName";
import { nav, isGroup, filterNav } from "@/lib/nav";
import { LogOut, X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

function getInitials(displayName: string | null | undefined, email: string | null | undefined): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : "U";
}

export default function Sidebar({
  open = false,
  onClose,
  collapsed = false,
}: {
  open?: boolean;
  onClose?: () => void;
  /** Desktop only: show icons without labels. The mobile drawer always shows labels. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, logout, can } = useAuth();
  const shopName = useShopName();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const initials = getInitials(user?.displayName, user?.email);
  const year = new Date().getFullYear();

  const visibleNav = filterNav(can);

  const activeGroup = nav.find(
    (entry) => isGroup(entry) && entry.children.some((c) => isActive(pathname, c.href))
  )?.label;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup] : [])
  );

  // Auto-expand the group containing the current page when navigating
  useEffect(() => {
    if (activeGroup) setOpenGroups((prev) => (prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup)));
  }, [activeGroup]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  // Classes applied only on desktop while collapsed
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";
  const centerWhenCollapsed = collapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-[100dvh] lg:h-auto bg-white border-r border-zinc-200 flex flex-col transform transition-[transform,width] duration-200 lg:static lg:translate-x-0 ${
          collapsed ? "lg:w-[4.5rem]" : "lg:w-56"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="px-4 py-2 border-b border-zinc-200 flex items-center justify-between gap-2">
          {/* The artwork has wide transparent margins; scale inside a clipped box to trim them */}
          <div className={`flex-1 flex justify-center overflow-hidden ${hideWhenCollapsed}`}>
            <Image
              src="/shop_logo/IMG_0112.PNG"
              alt="M-Fixpro"
              width={400}
              height={200}
              className="w-28 h-auto scale-[1.4]"
              priority
            />
          </div>
          {collapsed && (
            <div className="hidden lg:flex flex-1 justify-center py-2">
              <Image src="/shop_logo/1_M.png" alt="M-Fixpro" width={64} height={80} className="w-8 h-auto" />
            </div>
          )}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-ink lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden sidebar-nav-scroll">
          {visibleNav.map((entry) => {
            const Icon = entry.icon;

            if (!isGroup(entry)) {
              const active = isActive(pathname, entry.href);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={onClose}
                  title={collapsed ? entry.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-poppins transition-colors ${centerWhenCollapsed} ${
                    active
                      ? "bg-brand text-white font-medium"
                      : "text-zinc-600 hover:text-brand hover:bg-brand-light"
                  }`}
                >
                  <Icon size={collapsed ? 17 : 15} className="shrink-0" />
                  <span className={`whitespace-nowrap ${hideWhenCollapsed}`}>{entry.label}</span>
                </Link>
              );
            }

            const expanded = openGroups.has(entry.label);
            const groupActive = activeGroup === entry.label;
            return (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  aria-expanded={expanded}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-poppins font-medium transition-colors ${hideWhenCollapsed} ${
                    groupActive ? "text-brand" : "text-ink hover:text-brand hover:bg-brand-light"
                  }`}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{entry.label}</span>
                  <ChevronDown
                    size={15}
                    className={`text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* grid-rows trick animates height without measuring. Collapsed: children always shown as icons */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ${
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  } ${collapsed ? "lg:grid-rows-[1fr]" : ""}`}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`ml-[1.2rem] pl-2 my-0.5 border-l border-dashed border-zinc-300 space-y-0.5 ${
                        collapsed ? "lg:ml-0 lg:pl-0 lg:border-l-0 lg:border-t lg:border-solid lg:border-zinc-100 lg:mt-2 lg:pt-2" : ""
                      }`}
                    >
                      {entry.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            title={collapsed ? child.label : undefined}
                            tabIndex={expanded || collapsed ? undefined : -1}
                            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-poppins transition-colors ${centerWhenCollapsed} ${
                              active
                                ? "bg-brand text-white font-medium"
                                : "text-zinc-600 hover:text-brand hover:bg-brand-light"
                            }`}
                          >
                            <ChildIcon size={collapsed ? 17 : 14} className="shrink-0" />
                            <span className={`whitespace-nowrap ${hideWhenCollapsed}`}>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-zinc-200 pt-4 shrink-0">
          <Link
            href="/profile"
            onClick={onClose}
            title={collapsed ? "View profile" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors group ${centerWhenCollapsed} ${
              pathname === "/profile" ? "bg-brand-light" : "hover:bg-zinc-100"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 transition-colors group-hover:bg-brand">
              <span className="text-white text-xs font-prata">{initials}</span>
            </div>
            <div className={`min-w-0 ${hideWhenCollapsed}`}>
              <p className="text-ink text-xs font-medium truncate">
                {user?.displayName || user?.email}
              </p>
              <p className="text-zinc-500 text-xs">{userRole ?? "Admin"} · View profile</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title={collapsed ? "Sign out" : undefined}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm text-zinc-600 hover:text-brand hover:bg-brand-light transition-colors font-poppins ${centerWhenCollapsed}`}
          >
            <LogOut size={15} className="shrink-0" />
            <span className={hideWhenCollapsed}>Sign out</span>
          </button>

          <div className={`text-zinc-400 text-[10px] font-poppins text-center mt-3 space-y-0.5 ${hideWhenCollapsed}`}>
            <p>© {year} {shopName}</p>
            <p className="text-zinc-500">Design &amp; Developed by plexCode</p>
          </div>
        </div>
      </aside>
    </>
  );
}
