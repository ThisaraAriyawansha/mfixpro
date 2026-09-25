"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useShopName } from "@/hooks/useShopName";
import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard, Package, Layers, BookMarked,
  ShoppingCart, Receipt, Shield, Settings, LogOut, X,
  Users, FileText, Wrench, PackagePlus, ArrowLeftRight, PackageMinus, History,
  Truck, ShieldCheck, Wallet, Banknote, Boxes, ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";

type NavLink = { label: string; href: string; icon: React.ElementType; permKey?: PermissionKey };
type NavGroup = { label: string; icon: React.ElementType; children: NavLink[] };
type NavEntry = NavLink | NavGroup;

const nav: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permKey: "dashboard.view" },
  { label: "POS / New Sale", href: "/sales", icon: ShoppingCart, permKey: "sales.view" },
  { label: "Jobs", href: "/jobs", icon: Wrench, permKey: "jobs.view" },
  {
    label: "Sales",
    icon: Receipt,
    children: [
      { label: "Bills", href: "/bills", icon: Receipt, permKey: "bills.view" },
      { label: "Quotations", href: "/quotations", icon: FileText, permKey: "quotations.view" },
      { label: "Warranty", href: "/warranty", icon: Shield, permKey: "warranty.view" },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    children: [
      { label: "Products", href: "/products", icon: Package, permKey: "products.view" },
      { label: "GRN", href: "/grn", icon: PackagePlus, permKey: "grn.view" },
      { label: "Stock Transfer", href: "/stock-transfer", icon: ArrowLeftRight, permKey: "stockTransfer.view" },
      { label: "Stock Out", href: "/stock-out", icon: PackageMinus, permKey: "stockOut.view" },
      { label: "Stock Movements", href: "/stock-movements", icon: History, permKey: "stockMovements.view" },
      { label: "Brands", href: "/brands", icon: BookMarked, permKey: "brands.view" },
      { label: "Categories", href: "/categories", icon: Layers, permKey: "categories.view" },
    ],
  },
  {
    label: "Contacts",
    icon: Users,
    children: [
      { label: "Customers", href: "/customers", icon: Users, permKey: "customers.view" },
      { label: "Suppliers", href: "/suppliers", icon: Truck, permKey: "suppliers.view" },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    children: [
      { label: "Overview", href: "/finance", icon: Wallet, permKey: "finance.view" },
      { label: "Salary", href: "/salary", icon: Banknote, permKey: "salary.view" },
    ],
  },
  {
    label: "System",
    icon: Settings,
    children: [
      { label: "Audit Log", href: "/audit-log", icon: ShieldCheck, permKey: "auditLog.view" },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

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
}: {
  open?: boolean;
  onClose?: () => void;
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

  // Drop links the user can't access, and groups left with no children
  const visibleNav = nav
    .map((entry) =>
      isGroup(entry)
        ? { ...entry, children: entry.children.filter((c) => !c.permKey || can(c.permKey)) }
        : entry
    )
    .filter((entry) => (isGroup(entry) ? entry.children.length > 0 : !entry.permKey || can(entry.permKey)));

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
        className={`fixed inset-y-0 left-0 z-50 w-64 h-[100dvh] lg:h-auto bg-white border-r border-zinc-200 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 lg:w-56 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-2 border-b border-zinc-200 flex items-center justify-between gap-2">
          {/* The artwork has wide transparent margins; scale inside a clipped box to trim them */}
          <div className="flex-1 flex justify-center overflow-hidden">
            <Image
              src="/shop_logo/IMG_0112.PNG"
              alt="M-Fixpro"
              width={400}
              height={200}
              className="w-28 h-auto scale-[1.4]"
              priority
            />
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-ink lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-nav-scroll">
          {visibleNav.map((entry) => {
            const Icon = entry.icon;

            if (!isGroup(entry)) {
              const active = isActive(pathname, entry.href);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-poppins transition-colors ${
                    active
                      ? "bg-brand text-white font-medium"
                      : "text-zinc-600 hover:text-brand hover:bg-brand-light"
                  }`}
                >
                  <Icon size={15} />
                  {entry.label}
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
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm font-poppins font-medium transition-colors ${
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

                {/* grid-rows trick animates height without measuring */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ${
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-[1.2rem] pl-2 my-0.5 border-l border-dashed border-zinc-300 space-y-0.5">
                      {entry.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            tabIndex={expanded ? undefined : -1}
                            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-poppins transition-colors ${
                              active
                                ? "bg-brand text-white font-medium"
                                : "text-zinc-600 hover:text-brand hover:bg-brand-light"
                            }`}
                          >
                            <ChildIcon size={14} />
                            {child.label}
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
            className={`flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors group ${
              pathname === "/profile" ? "bg-brand-light" : "hover:bg-zinc-100"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 transition-colors group-hover:bg-brand">
              <span className="text-white text-xs font-prata">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-ink text-xs font-medium truncate">
                {user?.displayName || user?.email}
              </p>
              <p className="text-zinc-500 text-xs">{userRole ?? "Admin"} · View profile</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm text-zinc-600 hover:text-brand hover:bg-brand-light transition-colors font-poppins"
          >
            <LogOut size={15} />
            Sign out
          </button>

          <div className="text-zinc-400 text-[10px] font-poppins text-center mt-3 space-y-0.5">
            <p>© {year} {shopName}</p>
            <p className="text-zinc-500">Design &amp; Developed by plexCode</p>
          </div>
        </div>
      </aside>
    </>
  );
}
