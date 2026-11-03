import { PermissionKey } from "@/lib/permissions";
import {
  Home, LayoutDashboard, Package, Layers, BookMarked,
  ShoppingCart, Receipt, Shield, Settings,
  Users, FileText, Wrench, PackagePlus, ArrowLeftRight, PackageMinus, History,
  Truck, ShieldCheck, Wallet, Banknote, Boxes, Hammer,
} from "lucide-react";

export type NavLink = { label: string; href: string; icon: React.ElementType; desc: string; permKey?: PermissionKey };
export type NavGroup = { label: string; icon: React.ElementType; children: NavLink[] };
export type NavEntry = NavLink | NavGroup;

export const nav: NavEntry[] = [
  { label: "Home", href: "/home", icon: Home, desc: "Shortcuts" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Business overview", permKey: "dashboard.view" },
  { label: "POS / New Sale", href: "/sales", icon: ShoppingCart, desc: "Start a new sale", permKey: "sales.view" },
  { label: "Jobs", href: "/jobs", icon: Wrench, desc: "Repair jobs", permKey: "jobs.view" },
  { label: "Services", href: "/services", icon: Hammer, desc: "Service catalogue", permKey: "services.view" },
  {
    label: "Sales",
    icon: Receipt,
    children: [
      { label: "Bills", href: "/bills", icon: Receipt, desc: "Invoices & payments", permKey: "bills.view" },
      { label: "Quotations", href: "/quotations", icon: FileText, desc: "Price quotes", permKey: "quotations.view" },
      { label: "Warranty", href: "/warranty", icon: Shield, desc: "Warranty claims", permKey: "warranty.view" },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    children: [
      { label: "Products", href: "/products", icon: Package, desc: "Manage inventory", permKey: "products.view" },
      { label: "GRN", href: "/grn", icon: PackagePlus, desc: "Goods received", permKey: "grn.view" },
      { label: "Stock Transfer", href: "/stock-transfer", icon: ArrowLeftRight, desc: "Move stock", permKey: "stockTransfer.view" },
      { label: "Stock Out", href: "/stock-out", icon: PackageMinus, desc: "Remove stock", permKey: "stockOut.view" },
      { label: "Stock Movements", href: "/stock-movements", icon: History, desc: "Stock history", permKey: "stockMovements.view" },
      { label: "Brands", href: "/brands", icon: BookMarked, desc: "Product brands", permKey: "brands.view" },
      { label: "Categories", href: "/categories", icon: Layers, desc: "Product categories", permKey: "categories.view" },
    ],
  },
  {
    label: "Contacts",
    icon: Users,
    children: [
      { label: "Customers", href: "/customers", icon: Users, desc: "Customer records", permKey: "customers.view" },
      { label: "Suppliers", href: "/suppliers", icon: Truck, desc: "Supplier records", permKey: "suppliers.view" },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    children: [
      { label: "Overview", href: "/finance", icon: Wallet, desc: "Income & expenses", permKey: "finance.view" },
      { label: "Salary", href: "/salary", icon: Banknote, desc: "Staff payroll", permKey: "salary.view" },
    ],
  },
  {
    label: "System",
    icon: Settings,
    children: [
      { label: "Audit Log", href: "/audit-log", icon: ShieldCheck, desc: "Activity history", permKey: "auditLog.view" },
      { label: "Settings", href: "/settings", icon: Settings, desc: "Shop configuration" },
    ],
  },
];

export const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

// Drop links the user can't access, and groups left with no children
export function filterNav(can: (key: PermissionKey) => boolean): NavEntry[] {
  return nav
    .map((entry) =>
      isGroup(entry)
        ? { ...entry, children: entry.children.filter((c) => !c.permKey || can(c.permKey)) }
        : entry
    )
    .filter((entry) => (isGroup(entry) ? entry.children.length > 0 : !entry.permKey || can(entry.permKey)));
}
