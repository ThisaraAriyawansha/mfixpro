"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getSales, getProducts, getCustomers, getSaleItemsForSales, getMainCategories, getJobs, getExpenses,
} from "@/lib/firestore";
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpRight, Award, Clock, CreditCard, Crown, Flame, Package,
  Plus, Receipt, ShoppingBag, Tag, Timer, UserPlus, Wrench, CheckCircle2, Activity,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/ui/AccessRestricted";
import { SALE_PAYMENT_METHOD_LABEL, salePaymentSplits } from "@/types";

type Period = "today" | "7d" | "30d";
type Delta = { pct: number; up: boolean } | null;

const PERIODS: { key: Period; label: string; days: number; compare: string }[] = [
  { key: "today", label: "Today", days: 1, compare: "vs yesterday" },
  { key: "7d", label: "7 Days", days: 7, compare: "vs previous 7 days" },
  { key: "30d", label: "30 Days", days: 30, compare: "vs previous 30 days" },
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIX_COLORS = ["#e30613", "#0a0a0a", "#71717a", "#d4d4d8", "#fca5a5"];
const JOB_STAGES: { key: string; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "#d4d4d8" },
  { key: "ongoing", label: "In repair", color: "#0a0a0a" },
  { key: "done", label: "Ready", color: "#e30613" },
  { key: "delivered", label: "Delivered", color: "#16a34a" },
  { key: "unrepairable", label: "Unrepairable", color: "#a1a1aa" },
];
const DAY_MS = 86_400_000;

function delta(current: number, previous: number): Delta {
  if (previous === 0) return current > 0 ? { pct: 100, up: true } : null;
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}
const toDate = (v: any): Date | undefined => v?.toDate?.() ?? (v instanceof Date ? v : undefined);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
function compact(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(a >= 100_000 ? 0 : 1)}K`;
  return Math.round(n).toString();
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function DeltaPill({ d, label, invert }: { d: Delta; label?: string; invert?: boolean }) {
  if (!d) return <span className="text-xs text-zinc-400">No prior data{label ? ` ${label.replace(/^vs /, "for ")}` : ""}</span>;
  const good = invert ? !d.up : d.up;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
        {d.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {d.pct.toFixed(0)}%
      </span>
      {label && <span className="text-zinc-400">{label}</span>}
    </span>
  );
}

function CardTitle({ icon: Icon, title, hint, action }: { icon?: any; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
        {Icon && <Icon size={12} className="shrink-0" />}
        <span className="truncate">{title}</span>
        {hint && <span className="normal-case tracking-normal text-zinc-400 truncate">· {hint}</span>}
      </p>
      {action}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-zinc-400 text-center py-8">{text}</p>;

export default function DashboardPage() {
  const { can } = useAuth();
  const canView = can("dashboard.view");
  // Same permission that gates the Finance page/nav link — revenue, profit,
  // expenses and payment figures are hidden from anyone without finance.view.
  const canViewFinance = can("finance.view");
  const canViewJobs = can("jobs.view");

  const [period, setPeriod] = useState<Period>("7d");
  const [raw, setRaw] = useState<{
    sales: any[]; saleItems: any[]; products: any[]; customers: any[]; mainCats: any[]; jobs: any[]; expenses: any[];
  } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      // 60 days = the longest selectable period (30 days) plus an equal-length
      // comparison window before it. Bounded so the read cost doesn't grow
      // forever as the shop accumulates years of sales history.
      const windowStart = startOfDay(new Date(Date.now() - 59 * DAY_MS));
      const [allSales, products, customers, mainCats, jobs, expenses] = await Promise.all([
        getSales({ fromDate: windowStart }),
        getProducts(),
        getCustomers(),
        getMainCategories(),
        canViewJobs ? getJobs().catch(() => []) : Promise.resolve([]),
        canViewFinance ? getExpenses({ fromDate: windowStart }).catch(() => []) : Promise.resolve([]),
      ]);
      const allSaleItems = await getSaleItemsForSales(allSales.map((s: any) => s.id));
      // Reversed bills shouldn't count toward revenue, trends, or product performance.
      const cancelledIds = new Set(allSales.filter((s: any) => s.status === "cancelled").map((s: any) => s.id));
      setRaw({
        sales: allSales.filter((s: any) => s.status !== "cancelled"),
        saleItems: allSaleItems.filter((it: any) => !cancelledIds.has(it.saleId)),
        products, customers, mainCats, jobs, expenses,
      });
    }
    load();
  }, [canViewJobs, canViewFinance]);

  const a = useMemo(() => {
    if (!raw) return null;
    const cfg = PERIODS.find((p) => p.key === period)!;
    const now = new Date();
    const todayStart = startOfDay(now);
    const curStart = new Date(todayStart.getTime() - (cfg.days - 1) * DAY_MS);
    const prevStart = new Date(curStart.getTime() - cfg.days * DAY_MS);
    const inCur = (d?: Date) => !!d && d >= curStart;
    const inPrev = (d?: Date) => !!d && d >= prevStart && d < curStart;

    const saleDate = new Map<string, Date | undefined>(raw.sales.map((s) => [s.id, toDate(s.createdAt)]));
    const costBySale = new Map<string, number>();
    for (const it of raw.saleItems) {
      costBySale.set(it.saleId, (costBySale.get(it.saleId) || 0) + (it.costPrice || 0) * (it.qty || 0));
    }

    const curSales = raw.sales.filter((s) => inCur(saleDate.get(s.id)));
    const prevSales = raw.sales.filter((s) => inPrev(saleDate.get(s.id)));
    const curItems = raw.saleItems.filter((it) => inCur(saleDate.get(it.saleId)));
    const sum = (arr: any[], f: (x: any) => number) => arr.reduce((t, x) => t + (f(x) || 0), 0);

    const revenue = sum(curSales, (s) => s.totalAmount);
    const prevRevenue = sum(prevSales, (s) => s.totalAmount);
    const cogs = sum(curSales, (s) => costBySale.get(s.id) || 0);
    const prevCogs = sum(prevSales, (s) => costBySale.get(s.id) || 0);
    // Gross profit off the bill total so repair service charges (no cost
    // basis) and discounts both land in the margin, not just product lines.
    const gross = revenue - cogs;
    const prevGross = prevRevenue - prevCogs;
    const expenses = sum(raw.expenses.filter((e) => inCur(toDate(e.createdAt))), (e) => e.amount);
    const prevExpenses = sum(raw.expenses.filter((e) => inPrev(toDate(e.createdAt))), (e) => e.amount);
    const net = gross - expenses;
    const orders = curSales.length;
    const aov = orders ? revenue / orders : 0;
    const prevAov = prevSales.length ? prevRevenue / prevSales.length : 0;
    const itemsSold = sum(curItems, (it) => it.qty);
    const repairRevenue = sum(curSales.filter((s) => s.jobId), (s) => s.totalAmount);
    const unsettled = raw.sales.filter((s) => s.paymentStatus && s.paymentStatus !== "paid");

    // Trend series — hourly for Today, daily otherwise, with the previous
    // period aligned bucket-for-bucket as a comparison line.
    type Pt = { label: string; sub: string; cur: number; prev: number };
    let series: Pt[] = [];
    if (period === "today") {
      series = Array.from({ length: 24 }, (_, h) => ({
        label: `${h % 12 || 12}${h < 12 ? "a" : "p"}`, sub: `${h}:00 – ${h}:59`, cur: 0, prev: 0,
      }));
      for (const s of curSales) series[saleDate.get(s.id)!.getHours()].cur += s.totalAmount || 0;
      for (const s of prevSales) series[saleDate.get(s.id)!.getHours()].prev += s.totalAmount || 0;
      // Trim empty leading/trailing hours so the chart focuses on trading hours.
      const active = series.map((p, i) => (p.cur || p.prev ? i : -1)).filter((i) => i >= 0);
      const from = Math.min(8, ...active), to = Math.max(20, now.getHours(), ...active);
      series = series.slice(from, to + 1);
    } else {
      series = Array.from({ length: cfg.days }, (_, i) => {
        const d = new Date(curStart.getTime() + i * DAY_MS);
        return {
          label: cfg.days > 7 ? `${d.getDate()}` : DAY_SHORT[d.getDay()],
          sub: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
          cur: 0, prev: 0,
        };
      });
      for (const s of curSales) {
        const i = Math.floor((startOfDay(saleDate.get(s.id)!).getTime() - curStart.getTime()) / DAY_MS);
        if (series[i]) series[i].cur += s.totalAmount || 0;
      }
      for (const s of prevSales) {
        const i = Math.floor((startOfDay(saleDate.get(s.id)!).getTime() - prevStart.getTime()) / DAY_MS);
        if (series[i]) series[i].prev += s.totalAmount || 0;
      }
    }

    // Busiest hours heatmap — always the last 30 days so it has enough signal.
    const heatStart = new Date(todayStart.getTime() - 29 * DAY_MS);
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const s of raw.sales) {
      const d = saleDate.get(s.id);
      if (d && d >= heatStart) heat[d.getDay()][d.getHours()] += 1;
    }
    const usedHours = heat.flatMap((row) => row.map((v, h) => (v ? h : -1))).filter((h) => h >= 0);
    const heatFrom = Math.min(8, ...usedHours), heatTo = Math.max(20, ...usedHours);
    const heatMax = Math.max(1, ...heat.flat());
    let peak = { day: 0, hour: 0, count: 0 };
    heat.forEach((row, d) => row.forEach((c, h) => { if (c > peak.count) peak = { day: d, hour: h, count: c }; }));

    // Products
    const byProduct = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    for (const it of curItems) {
      const key = it.productId || it.productName;
      const e = byProduct.get(key) || { name: it.productName, qty: 0, revenue: 0, cost: 0 };
      e.qty += it.qty || 0;
      e.revenue += it.lineTotal || 0;
      e.cost += (it.costPrice || 0) * (it.qty || 0);
      byProduct.set(key, e);
    }
    const topProducts = Array.from(byProduct.values()).sort((x, y) => y.revenue - x.revenue).slice(0, 6);

    // Category mix
    const productCat = new Map(raw.products.map((p) => [p.id, p.mainCategoryId]));
    const catName = new Map(raw.mainCats.map((c) => [c.id, c.name]));
    const byCat = new Map<string, number>();
    for (const it of curItems) {
      const n = catName.get(productCat.get(it.productId)) || "Uncategorized";
      byCat.set(n, (byCat.get(n) || 0) + (it.lineTotal || 0));
    }
    const serviceLines = sum(curSales, (s) => sum(s.services || [], (sv: any) => (sv.chargeType === "paid" ? sv.price : 0)));
    if (serviceLines > 0) byCat.set("Repair services", (byCat.get("Repair services") || 0) + serviceLines);
    const catTotal = Array.from(byCat.values()).reduce((x, y) => x + y, 0);
    const categories = Array.from(byCat.entries())
      .map(([name, amount]) => ({ name, amount, pct: catTotal ? (amount / catTotal) * 100 : 0 }))
      .sort((x, y) => y.amount - x.amount).slice(0, 5);

    // Payment mix
    const byMethod = new Map<string, number>();
    for (const s of curSales) for (const sp of salePaymentSplits(s)) {
      const m = sp.method || "other";
      byMethod.set(m, (byMethod.get(m) || 0) + (sp.amount || 0));
    }
    const payTotal = Array.from(byMethod.values()).reduce((x, y) => x + y, 0);
    const payments = Array.from(byMethod.entries())
      .map(([method, amount]) => ({ method, amount, pct: payTotal ? (amount / payTotal) * 100 : 0 }))
      .sort((x, y) => y.amount - x.amount);

    // Staff
    const byStaff = new Map<string, { name: string; revenue: number; count: number }>();
    for (const s of curSales) {
      const name = s.cashierName || "Unknown";
      const e = byStaff.get(name) || { name, revenue: 0, count: 0 };
      e.revenue += s.totalAmount || 0;
      e.count += 1;
      byStaff.set(name, e);
    }
    const staff = Array.from(byStaff.values()).sort((x, y) => y.revenue - x.revenue).slice(0, 5);

    // Customers
    const byCustomer = new Map<string, { name: string; spend: number; visits: number }>();
    for (const s of curSales) {
      if (!s.customerId && !s.customerName) continue;
      const key = s.customerId || s.customerName;
      const e = byCustomer.get(key) || { name: s.customerName || "Customer", spend: 0, visits: 0 };
      e.spend += s.totalAmount || 0;
      e.visits += 1;
      byCustomer.set(key, e);
    }
    const topCustomers = Array.from(byCustomer.values()).sort((x, y) => y.spend - x.spend).slice(0, 5);
    const walkIns = curSales.filter((s) => !s.customerId && !s.customerName).length;
    const newCustomers = raw.customers.filter((c) => inCur(toDate(c.createdAt))).length;
    const prevNewCustomers = raw.customers.filter((c) => inPrev(toDate(c.createdAt))).length;

    // Repair jobs
    const jobs = raw.jobs;
    const stageCounts = new Map<string, number>();
    for (const j of jobs) stageCounts.set(j.status, (stageCounts.get(j.status) || 0) + 1);
    const openJobs = jobs.filter((j) => j.status === "pending" || j.status === "ongoing");
    const overdue = openJobs.filter((j) => { const d = toDate(j.expectedDeliveryDate); return d && d < todayStart; });
    const ready = jobs
      .filter((j) => j.status === "done")
      .map((j) => ({ ...j, waiting: Math.floor((now.getTime() - (toDate(j.createdAt)?.getTime() ?? now.getTime())) / DAY_MS) }))
      .sort((x, y) => y.waiting - x.waiting);
    const received = jobs.filter((j) => inCur(toDate(j.createdAt))).length;
    const prevReceived = jobs.filter((j) => inPrev(toDate(j.createdAt))).length;
    const returned = jobs.filter((j) => j.status === "delivered" && inCur(toDate(j.dateReturned)));
    const turnaround = returned.length
      ? returned.reduce((t, j) => t + ((toDate(j.dateReturned)!.getTime() - (toDate(j.createdAt)?.getTime() ?? 0)) / DAY_MS), 0) / returned.length
      : null;
    const closed = jobs.filter((j) => j.status === "delivered" || j.status === "unrepairable" || j.status === "done");
    const successRate = closed.length ? (closed.filter((j) => j.status !== "unrepairable").length / closed.length) * 100 : null;
    const byTech = new Map<string, number>();
    for (const j of openJobs) {
      const n = j.assignedTechnicianName || "Unassigned";
      byTech.set(n, (byTech.get(n) || 0) + 1);
    }
    const techLoad = Array.from(byTech.entries()).map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count).slice(0, 5);
    const byDevice = new Map<string, number>();
    for (const j of jobs.filter((j) => inCur(toDate(j.createdAt)))) {
      const n = (j.deviceType === "Other" && j.deviceTypeOther) || j.deviceType || "Other";
      byDevice.set(n, (byDevice.get(n) || 0) + 1);
    }
    const devices = Array.from(byDevice.entries()).map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count).slice(0, 4);

    // Recent activity — sales and job intakes on one timeline.
    const activity = [
      ...raw.sales.slice(0, 8).map((s) => ({
        kind: "sale" as const, id: s.id, when: saleDate.get(s.id), title: s.invoiceNo,
        sub: s.customerName || "Walk-in customer", amount: s.totalAmount as number, status: s.paymentStatus as string,
      })),
      ...jobs.slice(0, 8).map((j) => ({
        kind: "job" as const, id: j.id, when: toDate(j.createdAt), title: j.jobNo,
        sub: [j.customerName, [j.brand, j.model].filter(Boolean).join(" ") || j.deviceType].filter(Boolean).join(" · "),
        amount: undefined as number | undefined, status: j.status as string,
      })),
    ].sort((x, y) => (y.when?.getTime() ?? 0) - (x.when?.getTime() ?? 0)).slice(0, 8);

    const lowStock = raw.products
      .filter((p) => p.totalStock <= p.lowStockAlert)
      .sort((x, y) => x.totalStock - y.totalStock);

    return {
      cfg, revenue, gross, cogs, expenses, net, orders, aov, itemsSold, repairRevenue, unsettled,
      margin: revenue ? (gross / revenue) * 100 : 0,
      revenueDelta: delta(revenue, prevRevenue), grossDelta: delta(gross, prevGross),
      netDelta: delta(net, prevGross - prevExpenses), ordersDelta: delta(orders, prevSales.length),
      aovDelta: delta(aov, prevAov), expensesDelta: delta(expenses, prevExpenses),
      series, heat, heatFrom, heatTo, heatMax, peak,
      topProducts, categories, payments, payTotal, staff, topCustomers, walkIns,
      newCustomers, newCustomersDelta: delta(newCustomers, prevNewCustomers), totalCustomers: raw.customers.length,
      stageCounts, jobsTotal: jobs.length, openJobs, overdue, ready, received, receivedDelta: delta(received, prevReceived),
      returnedCount: returned.length, turnaround, successRate, techLoad, devices, activity, lowStock,
      productCount: raw.products.length,
    };
  }, [raw, period]);

  if (!canView) return <AccessRestricted message="You don't have permission to view the Dashboard." />;

  const loading = !a;
  const cmp = PERIODS.find((p) => p.key === period)!.compare;

  return (
    <div className="p-4 sm:p-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-2">
        <div>
          <p className="text-sm text-zinc-500">{greeting()} 👋</p>
          <h1 className="font-prata text-2xl text-ink mt-0.5">Business Overview</h1>
          <p className="text-zinc-400 text-xs mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-md transition-all ${
                  period === p.key ? "bg-white text-ink shadow-sm font-medium" : "text-zinc-500 hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/sales" className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm px-3.5 py-2 transition-colors">
            <Plus size={14} /> New Sale
          </Link>
          {canViewJobs && (
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 hover:border-black text-ink text-sm px-3.5 py-2 transition-colors">
              <Wrench size={14} /> New Job
            </Link>
          )}
        </div>
      </div>

      {/* Attention strip */}
      {a && (a.lowStock.length > 0 || a.overdue.length > 0 || a.ready.length > 0 || a.unsettled.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {a.overdue.length > 0 && (
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 text-xs px-3 py-1.5 hover:bg-red-100 transition-colors">
              <Clock size={12} /> {a.overdue.length} repair{a.overdue.length > 1 ? "s" : ""} past promised date
            </Link>
          )}
          {a.ready.length > 0 && (
            <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={12} /> {a.ready.length} device{a.ready.length > 1 ? "s" : ""} ready for pickup
            </Link>
          )}
          {a.lowStock.length > 0 && (
            <Link href="/products" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 text-xs px-3 py-1.5 hover:bg-amber-100 transition-colors">
              <AlertTriangle size={12} /> {a.lowStock.length} product{a.lowStock.length > 1 ? "s" : ""} low on stock
            </Link>
          )}
          {canViewFinance && a.unsettled.length > 0 && (
            <Link href="/bills" className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs px-3 py-1.5 hover:bg-zinc-200 transition-colors">
              <Receipt size={12} /> {a.unsettled.length} unsettled bill{a.unsettled.length > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {/* Row 1 — revenue hero + P&L */}
      {canViewFinance && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 nexora-card text-ink p-5 sm:p-6 min-w-0 overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">Revenue · {a?.cfg.label ?? "…"}</p>
                <p className="font-prata text-3xl sm:text-4xl mt-2 truncate">{a ? rs(a.revenue) : "—"}</p>
                <div className="mt-2">{a && <DeltaPill d={a.revenueDelta} label={cmp} />}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-6 shrink-0">
                {[
                  { label: "Orders", value: a ? a.orders.toLocaleString() : "—", d: a?.ordersDelta },
                  { label: "Avg ticket", value: a ? compact(a.aov) : "—", d: a?.aovDelta },
                  { label: "Items sold", value: a ? a.itemsSold.toLocaleString() : "—" },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{m.label}</p>
                    <p className="text-lg font-semibold mt-1">{m.value}</p>
                    {m.d !== undefined && m.d && (
                      <p className={`text-[10px] ${m.d.up ? "text-emerald-600" : "text-red-600"}`}>
                        {m.d.up ? "▲" : "▼"} {m.d.pct.toFixed(0)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trend chart */}
            <div className="relative mt-6">
              {loading ? (
                <div className="h-44 flex items-center justify-center text-sm text-zinc-500">Loading…</div>
              ) : (
                <TrendChart series={a!.series} hoverIdx={hoverIdx} setHoverIdx={setHoverIdx} />
              )}
              <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand rounded" /> This period</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-zinc-400" /> Previous period</span>
                {a && a.repairRevenue > 0 && (
                  <span className="ml-auto">Repairs: <span className="text-ink font-medium">{rs(a.repairRevenue)}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Profit & loss */}
          <div className="xl:col-span-4 nexora-card p-5 min-w-0">
            <CardTitle icon={Activity} title="Profit & Loss" hint={a?.cfg.label} />
            {loading ? <Empty text="Loading…" /> : (
              <>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Net profit</p>
                    <p className={`font-prata text-2xl mt-1 ${a!.net < 0 ? "text-red-600" : "text-ink"}`}>{rs(a!.net)}</p>
                  </div>
                  <DeltaPill d={a!.netDelta} />
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Revenue", value: a!.revenue, color: "#0a0a0a" },
                    { label: "Cost of goods", value: -a!.cogs, color: "#a1a1aa" },
                    { label: "Gross profit", value: a!.gross, color: "#16a34a" },
                    { label: "Expenses", value: -a!.expenses, color: "#e30613" },
                  ].map((r) => {
                    const w = a!.revenue ? Math.min(100, (Math.abs(r.value) / a!.revenue) * 100) : 0;
                    return (
                      <div key={r.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-zinc-600">{r.label}</span>
                          <span className="text-ink font-medium tabular-nums">{r.value < 0 ? "− " : ""}{rs(Math.abs(r.value))}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${w}%`, background: r.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-zinc-100">
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Gross margin</p>
                    <p className="text-lg font-semibold text-ink mt-0.5">{a!.margin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Expense ratio</p>
                    <p className="text-lg font-semibold text-ink mt-0.5">
                      {a!.revenue ? ((a!.expenses / a!.revenue) * 100).toFixed(1) : "0.0"}%
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Row 2 — KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          canViewJobs && { label: "Active repairs", value: a?.openJobs.length, icon: Wrench, foot: a ? `${a.overdue.length} overdue` : "", tone: a && a.overdue.length ? "text-red-500" : "text-zinc-400" },
          canViewJobs && { label: "Jobs received", value: a?.received, icon: Package, d: a?.receivedDelta },
          { label: "New customers", value: a?.newCustomers, icon: UserPlus, d: a?.newCustomersDelta },
          canViewFinance
            ? { label: "Unsettled bills", value: a?.unsettled.length, icon: CreditCard, foot: a ? `${rs(a.unsettled.reduce((t: number, s: any) => t + (s.totalAmount || 0), 0))} billed` : "", tone: "text-zinc-400" }
            : { label: "Orders", value: a?.orders, icon: ShoppingBag, d: a?.ordersDelta },
          !canViewJobs && { label: "Products", value: a?.productCount, icon: Package, foot: "In inventory", tone: "text-zinc-400" },
          !canViewJobs && { label: "Customers", value: a?.totalCustomers, icon: UserPlus, foot: "Registered", tone: "text-zinc-400" },
        ].filter(Boolean).map((k: any) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="nexora-card p-4 sm:p-5 min-w-0 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-ink" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider truncate">{k.label}</p>
                <p className="font-prata text-xl text-ink mt-0.5">{k.value ?? "—"}</p>
                {k.d !== undefined ? (
                  <div className="mt-0.5">{a && <DeltaPill d={k.d} />}</div>
                ) : (
                  <p className={`text-xs mt-0.5 ${k.tone}`}>{k.foot}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 3 — repair workshop + busiest hours */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {canViewJobs && (
          <div className="xl:col-span-7 nexora-card p-5 min-w-0">
            <CardTitle
              icon={Wrench}
              title="Repair Workshop"
              hint={a ? `${a.jobsTotal} jobs total` : undefined}
              action={<Link href="/jobs" className="text-xs text-zinc-500 hover:text-ink inline-flex items-center gap-0.5">Open jobs <ArrowUpRight size={12} /></Link>}
            />
            {loading ? <Empty text="Loading…" /> : a!.jobsTotal === 0 ? <Empty text="No repair jobs yet" /> : (
              <>
                {/* Pipeline */}
                <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100">
                  {JOB_STAGES.map((s) => {
                    const c = a!.stageCounts.get(s.key) || 0;
                    return c ? <div key={s.key} title={`${s.label}: ${c}`} style={{ width: `${(c / a!.jobsTotal) * 100}%`, background: s.color }} /> : null;
                  })}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                  {JOB_STAGES.map((s) => (
                    <div key={s.key} className="min-w-0">
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /> {s.label}
                      </p>
                      <p className="text-lg font-semibold text-ink">{a!.stageCounts.get(s.key) || 0}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 py-4 border-y border-zinc-100">
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Timer size={11} /> Avg turnaround</p>
                    <p className="text-base font-semibold text-ink mt-0.5">{a!.turnaround === null ? "—" : `${a!.turnaround.toFixed(1)} days`}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Delivered</p>
                    <p className="text-base font-semibold text-ink mt-0.5">{a!.returnedCount} <span className="text-xs font-normal text-zinc-400">{a!.cfg.label.toLowerCase()}</span></p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Fix rate</p>
                    <p className="text-base font-semibold text-ink mt-0.5">{a!.successRate === null ? "—" : `${a!.successRate.toFixed(0)}%`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink mb-2">Waiting for pickup</p>
                    {a!.ready.length === 0 ? <p className="text-xs text-zinc-400">Nothing waiting</p> : (
                      <div className="space-y-2">
                        {a!.ready.slice(0, 4).map((j: any) => (
                          <div key={j.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-ink truncate leading-tight">{j.customerName}</p>
                              <p className="text-[11px] text-zinc-400 truncate">{j.jobNo} · {[j.brand, j.model].filter(Boolean).join(" ") || j.deviceType}</p>
                            </div>
                            <span className={`badge shrink-0 ${j.waiting > 7 ? "badge-danger" : "badge-default"}`}>{j.waiting}d</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink mb-2">Technician workload</p>
                    {a!.techLoad.length === 0 ? <p className="text-xs text-zinc-400">No open jobs</p> : (
                      <div className="space-y-2.5">
                        {a!.techLoad.map((t) => (
                          <div key={t.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-600 truncate">{t.name}</span>
                              <span className="text-zinc-400 shrink-0">{t.count} open</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                              <div className="h-full bg-ink rounded-full" style={{ width: `${(t.count / a!.techLoad[0].count) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {a!.devices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {a!.devices.map((d) => (
                          <span key={d.name} className="badge badge-default">{d.name} · {d.count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Busiest hours heatmap */}
        <div className={`${canViewJobs ? "xl:col-span-5" : "xl:col-span-12"} nexora-card p-5 min-w-0`}>
          <CardTitle icon={Flame} title="Busiest Hours" hint="Last 30 days" />
          {loading ? <Empty text="Loading…" /> : (
            <>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="min-w-[320px]">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <div key={day} className="flex items-center gap-1 mb-1">
                      <span className="w-8 text-[10px] text-zinc-400 shrink-0">{DAY_SHORT[day]}</span>
                      {a!.heat[day].slice(a!.heatFrom, a!.heatTo + 1).map((c, i) => {
                        const t = c / a!.heatMax;
                        return (
                          <div
                            key={i}
                            title={`${DAY_SHORT[day]} ${a!.heatFrom + i}:00 — ${c} sale${c === 1 ? "" : "s"}`}
                            className="flex-1 aspect-square rounded-[3px]"
                            style={{ background: c ? `rgba(227, 6, 19, ${0.15 + t * 0.85})` : "#f4f4f5" }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-8 shrink-0" />
                    {Array.from({ length: a!.heatTo - a!.heatFrom + 1 }, (_, i) => a!.heatFrom + i).map((h) => (
                      <span key={h} className="flex-1 text-center text-[9px] text-zinc-400">{h % 3 === 0 ? `${h % 12 || 12}${h < 12 ? "a" : "p"}` : ""}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
                <div>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Peak slot</p>
                  <p className="text-sm font-medium text-ink mt-0.5">
                    {a!.peak.count ? `${DAY_SHORT[a!.peak.day]} · ${a!.peak.hour % 12 || 12}${a!.peak.hour < 12 ? "am" : "pm"} (${a!.peak.count} sales)` : "Not enough data"}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  Less
                  {[0.15, 0.4, 0.65, 1].map((o) => <span key={o} className="w-3 h-3 rounded-[3px]" style={{ background: `rgba(227,6,19,${o})` }} />)}
                  More
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4 — products, sales mix, team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-4">
        {canViewFinance && (
          <div className="xl:col-span-5 nexora-card min-w-0">
            <div className="px-5 pt-5">
              <CardTitle icon={Package} title="Top Products" hint={a?.cfg.label} />
            </div>
            {loading ? <Empty text="Loading…" /> : a!.topProducts.length === 0 ? <Empty text="No product sales in this period" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                    <th className="text-left font-normal px-5 pb-2">Product</th>
                    <th className="text-right font-normal px-2 pb-2">Qty</th>
                    <th className="text-right font-normal px-2 pb-2 hidden sm:table-cell">Margin</th>
                    <th className="text-right font-normal px-5 pb-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {a!.topProducts.map((p, i) => {
                    const m = p.revenue ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.name + i}>
                        <td className="px-5 py-2.5 max-w-0 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded text-[10px] flex items-center justify-center shrink-0 ${i === 0 ? "bg-brand text-white" : "bg-zinc-100 text-zinc-500"}`}>{i + 1}</span>
                            <span className="truncate text-ink">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right text-zinc-600 tabular-nums">{p.qty}</td>
                        <td className={`px-2 py-2.5 text-right tabular-nums hidden sm:table-cell ${m < 10 ? "text-red-500" : "text-emerald-600"}`}>{m.toFixed(0)}%</td>
                        <td className="px-5 py-2.5 text-right font-medium text-ink tabular-nums whitespace-nowrap">{rs(p.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className={`${canViewFinance ? "xl:col-span-4" : "xl:col-span-6"} nexora-card p-5 min-w-0`}>
          <CardTitle icon={Tag} title="Sales Mix" hint={a?.cfg.label} />
          {loading ? <Empty text="Loading…" /> : a!.categories.length === 0 ? <Empty text="No sales in this period" /> : (
            <>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-100 mb-3">
                {a!.categories.map((c, i) => <div key={c.name} style={{ width: `${c.pct}%`, background: MIX_COLORS[i % MIX_COLORS.length] }} />)}
              </div>
              <div className="space-y-2">
                {a!.categories.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MIX_COLORS[i % MIX_COLORS.length] }} />
                      <span className="text-zinc-700 truncate">{c.name}</span>
                    </span>
                    <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                      {canViewFinance && <span className="text-zinc-600 mr-2">{compact(c.amount)}</span>}
                      {c.pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              {canViewFinance && a!.payments.length > 0 && (
                <div className="mt-5 pt-4 border-t border-zinc-100">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wider mb-2.5">Payment methods</p>
                  <div className="grid grid-cols-2 gap-2">
                    {a!.payments.slice(0, 4).map((p, i) => (
                      <div key={p.method} className="rounded-lg bg-zinc-50 px-3 py-2">
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: MIX_COLORS[i % MIX_COLORS.length] }} />
                          {SALE_PAYMENT_METHOD_LABEL[p.method] || p.method}
                        </p>
                        <p className="text-sm font-semibold text-ink mt-0.5">{p.pct.toFixed(0)}% <span className="text-[11px] font-normal text-zinc-400">{compact(p.amount)}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={`${canViewFinance ? "xl:col-span-3" : "xl:col-span-6"} nexora-card p-5 min-w-0`}>
          <CardTitle icon={Award} title="Team" hint={a?.cfg.label} />
          {loading ? <Empty text="Loading…" /> : a!.staff.length === 0 ? <Empty text="No sales in this period" /> : (
            <div className="space-y-3">
              {a!.staff.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${i === 0 ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600"}`}>
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate leading-tight">{s.name}</p>
                    <p className="text-[11px] text-zinc-400">{s.count} sale{s.count === 1 ? "" : "s"}</p>
                  </div>
                  {canViewFinance && <p className="text-sm font-medium text-ink shrink-0 tabular-nums">{compact(s.revenue)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5 — customers, activity, low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-4">
        {canViewFinance && (
          <div className="xl:col-span-4 nexora-card p-5 min-w-0">
            <CardTitle icon={Crown} title="Top Customers" hint={a?.cfg.label} />
            {loading ? <Empty text="Loading…" /> : a!.topCustomers.length === 0 ? <Empty text="No named customers in this period" /> : (
              <div className="space-y-3">
                {a!.topCustomers.map((c, i) => (
                  <div key={c.name + i} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate leading-tight">{c.name}</p>
                      <p className="text-[11px] text-zinc-400">{c.visits} visit{c.visits === 1 ? "" : "s"}</p>
                    </div>
                    <p className="text-sm font-medium text-ink shrink-0 tabular-nums">{rs(c.spend)}</p>
                  </div>
                ))}
              </div>
            )}
            {a && a.walkIns > 0 && (
              <p className="text-[11px] text-zinc-400 mt-4 pt-3 border-t border-zinc-100">+ {a.walkIns} walk-in sale{a.walkIns === 1 ? "" : "s"}</p>
            )}
          </div>
        )}

        <div className={`${canViewFinance ? "xl:col-span-5" : "xl:col-span-8"} nexora-card min-w-0`}>
          <div className="px-5 pt-5">
            <CardTitle
              icon={Activity}
              title="Recent Activity"
              action={<Link href="/bills" className="text-xs text-zinc-500 hover:text-ink inline-flex items-center gap-0.5">All bills <ArrowUpRight size={12} /></Link>}
            />
          </div>
          {loading ? <Empty text="Loading…" /> : a!.activity.length === 0 ? <Empty text="Nothing yet" /> : (
            <div className="divide-y divide-zinc-50 pb-2">
              {a!.activity.map((e) => (
                <div key={e.kind + e.id} className="px-5 py-2 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${e.kind === "sale" ? "bg-zinc-100 text-ink" : "bg-brand-light text-brand"}`}>
                    {e.kind === "sale" ? <ShoppingBag size={13} /> : <Wrench size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink leading-tight truncate">{e.title}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{e.sub}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {e.amount !== undefined && canViewFinance ? (
                      <p className="text-sm font-medium text-ink tabular-nums">{rs(e.amount)}</p>
                    ) : (
                      <span className={`badge ${e.status === "done" || e.status === "paid" || e.status === "delivered" ? "badge-success" : e.status === "unrepairable" ? "badge-danger" : "badge-warning"}`}>{e.status}</span>
                    )}
                    <p className="text-[10px] text-zinc-400">{e.when ? timeAgo(e.when) : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${canViewFinance ? "xl:col-span-3" : "xl:col-span-4"} nexora-card p-5 min-w-0`}>
          <CardTitle
            icon={AlertTriangle}
            title="Low Stock"
            action={<Link href="/products" className="text-xs text-zinc-500 hover:text-ink inline-flex items-center gap-0.5">Inventory <ArrowUpRight size={12} /></Link>}
          />
          {loading ? <Empty text="Loading…" /> : a!.lowStock.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 size={22} className="mx-auto text-emerald-500" />
              <p className="text-sm text-zinc-500 mt-2">All stocked up</p>
              <p className="text-[11px] text-zinc-400">{a!.productCount} products tracked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {a!.lowStock.slice(0, 6).map((p: any) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-zinc-700 truncate">{p.name}</span>
                    <span className={`badge shrink-0 ${p.totalStock === 0 ? "badge-danger" : "badge-warning"}`}>{p.totalStock} left</span>
                  </div>
                  <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.totalStock === 0 ? "bg-red-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.max(3, Math.min(100, (p.totalStock / Math.max(1, p.lowStockAlert)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// SVG area chart: current period as a filled red line, previous period as a
// dashed grey line on the same scale, with a hover crosshair + tooltip.
function TrendChart({
  series, hoverIdx, setHoverIdx,
}: {
  series: { label: string; sub: string; cur: number; prev: number }[];
  hoverIdx: number | null;
  setHoverIdx: (i: number | null) => void;
}) {
  const W = 600, H = 170, PAD_T = 12, PAD_B = 2;
  const n = series.length;
  const max = Math.max(1, ...series.map((p) => Math.max(p.cur, p.prev))) * 1.1;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const path = (key: "cur" | "prev") => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${path("cur")} L${x(n - 1)},${H - PAD_B} L${x(0)},${H - PAD_B} Z`;
  const step = Math.ceil(n / 10);
  const h = hoverIdx !== null && hoverIdx < n ? series[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-44 overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
          setHoverIdx(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e30613" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#e30613" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={PAD_T + g * (H - PAD_T - PAD_B)} y2={PAD_T + g * (H - PAD_T - PAD_B)} stroke="#f4f4f5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={path("prev")} fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#revFill)" />
        <path d={path("cur")} fill="none" stroke="#e30613" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {h && (
          <line x1={x(hoverIdx!)} x2={x(hoverIdx!)} y1={PAD_T} y2={H - PAD_B} stroke="#d4d4d8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Hover dot in HTML so it stays round under the non-uniform SVG scale. */}
      {h && (
        <>
          <span
            className="absolute w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${(x(hoverIdx!) / W) * 100}%`, top: `${(y(h.cur) / H) * 100}%` }}
          />
          <div
            className="absolute top-0 -translate-x-1/2 rounded-md bg-ink text-white text-[11px] px-2.5 py-1.5 shadow-lg pointer-events-none whitespace-nowrap z-10"
            style={{ left: `${Math.min(88, Math.max(12, (x(hoverIdx!) / W) * 100))}%` }}
          >
            <p className="text-zinc-400">{h.sub}</p>
            <p className="font-semibold">{rs(h.cur)}</p>
            <p className="text-zinc-400">prev {rs(h.prev)}</p>
          </div>
        </>
      )}
      <div className="relative h-4 mt-1">
        {series.map((p, i) =>
          i % step === 0 || i === n - 1 || hoverIdx === i ? (
            <span
              key={i}
              className={`absolute -translate-x-1/2 text-[10px] ${hoverIdx === i ? "text-ink font-medium" : "text-zinc-400"}`}
              style={{ left: `${(x(i) / W) * 100}%` }}
            >
              {p.label}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
