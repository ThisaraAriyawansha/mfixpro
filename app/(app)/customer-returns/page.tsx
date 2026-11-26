"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCustomerReturns, getCustomerReturn, settleCustomerReturn, getAvailableUnits, getCurrentOpenShift, dateInputRange,
} from "@/lib/firestore";
import { daysAgoInput, todayInput, DEFAULT_LIST_DAYS } from "@/lib/dates";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Eye, X, Undo2, Download, CheckCircle2 } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { rowsToCSV, downloadCSV } from "@/lib/csv";
import AccessRestricted from "@/components/ui/AccessRestricted";
import { SALE_PAYMENT_METHODS, type SalePaymentMethod } from "@/types";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: "badge-warning", label: "Pending" },
  settled: { cls: "badge-success", label: "Settled" },
};

const methodLabel = (m?: string) => SALE_PAYMENT_METHODS.find((x) => x.value === m)?.label || m || "";

function outcomeLabel(r: any) {
  if (r.status === "pending") return "Waiting — refund or replace";
  if (r.settlementType === "replacement") return "Replaced with new unit";
  return `Refunded Rs. ${(r.refundAmount ?? 0).toLocaleString()} (${methodLabel(r.refundMethod)})`;
}

export default function CustomerReturnsPage() {
  const { user, userDisplayName, can } = useAuth();
  const canView = can("customerReturns.view");
  const canCreate = can("customerReturns.create");
  const canSettle = can("customerReturns.settle");

  const [returns, setReturns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "settled">("");
  const [fromDate, setFromDate] = useState(daysAgoInput(DEFAULT_LIST_DAYS));
  const [toDate, setToDate] = useState(todayInput());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<any>(null);

  const [settling, setSettling] = useState(false);
  const [form, setForm] = useState({
    type: "refund" as "refund" | "replacement",
    refundAmount: "",
    refundMethod: "cash" as SalePaymentMethod,
    serials: {} as Record<string, string[]>,
    note: "",
  });
  const [unitOptions, setUnitOptions] = useState<Record<string, string[]>>({});
  const [shift, setShift] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => getCustomerReturns(dateInputRange(fromDate, toDate)).then((r) => { setReturns(r); setLoading(false); });

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, fromDate, toDate]);

  useEffect(() => setPage(1), [search, statusFilter, fromDate, toDate]);

  const open = async (id: string) => {
    setView(await getCustomerReturn(id));
    setSettling(false);
    setError("");
  };

  const startSettle = async () => {
    setForm({ type: "refund", refundAmount: String(view.totalValue ?? ""), refundMethod: "cash", serials: {}, note: "" });
    setError("");
    setSettling(true);
    // Showroom serials available as replacements, and this user's open shift
    // (a refund comes out of its takings).
    const serialItems = (view.items as any[]).filter((i) => (i.serialNumbers?.length ?? 0) > 0);
    const [opts, openShift] = await Promise.all([
      Promise.all(serialItems.map((i) => getAvailableUnits(i.productId, "showroom").then((u: any[]) => [i.id, u.map((x) => x.serialNumber)] as const))),
      getCurrentOpenShift(user!.uid).catch(() => null),
    ]);
    setUnitOptions(Object.fromEntries(opts));
    setShift(openShift);
  };

  const toggleSerial = (itemId: string, sn: string) =>
    setForm((f) => {
      const cur = f.serials[itemId] || [];
      return { ...f, serials: { ...f.serials, [itemId]: cur.includes(sn) ? cur.filter((x) => x !== sn) : [...cur, sn] } };
    });

  const handleSettle = async () => {
    setSaving(true);
    setError("");
    try {
      await settleCustomerReturn(view.id, {
        type: form.type,
        refundAmount: Number(form.refundAmount),
        refundMethod: form.refundMethod,
        shiftId: shift?.id ?? null,
        replacementSerials: form.serials,
        note: form.note,
        performedBy: { uid: user!.uid, name: userDisplayName || user?.email || "Unknown" },
      });
      setView(await getCustomerReturn(view.id));
      setSettling(false);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to settle.");
    } finally {
      setSaving(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = returns.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      (r.returnNo?.toLowerCase().includes(q) ||
        r.invoiceNo?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.includes(search))
  );
  const pendingCount = returns.filter((r) => r.status === "pending").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleExportCSV = () => {
    downloadCSV(
      `customer-returns-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCSV(
        filtered.map((r) => ({
          "Return No.": r.returnNo,
          Invoice: r.invoiceNo,
          Customer: r.customerName,
          Phone: r.customerPhone || "",
          Value: r.totalValue,
          Status: STATUS_BADGE[r.status]?.label || r.status,
          Outcome: outcomeLabel(r),
          "Accepted By": r.createdByName,
          Note: r.note || "",
          Date: r.createdAt,
        }))
      )
    );
  };

  if (!canView) return <AccessRestricted message="You don't have permission to view Customer Returns." />;

  const serialItems = (view?.items ?? []).filter((i: any) => (i.serialNumbers?.length ?? 0) > 0);
  const hasDamaged = (view?.items ?? []).some((i: any) => i.condition === "damaged");

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-prata text-2xl text-ink">Customer Returns</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {pendingCount > 0 ? `${pendingCount} waiting for refund or replacement` : `${returns.length} returns recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={handleExportCSV} disabled={filtered.length === 0} className="nexora-btn nexora-btn-outline disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} /> Download CSV
          </button>
          {canCreate && (
            <Link href="/customer-returns/new" className="nexora-btn nexora-btn-primary">
              <Plus size={14} /> New Return
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="nexora-input pl-9" placeholder="Search no., invoice, customer, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="nexora-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
        <input type="date" aria-label="From date" className="nexora-input w-auto" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
        <span className="text-zinc-300 text-xs">–</span>
        <input type="date" aria-label="To date" className="nexora-input w-auto" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); }} className="nexora-btn nexora-btn-ghost text-xs py-2">Clear</button>
        )}
      </div>

      <div className="nexora-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-100">
              {["No.", "Invoice", "Customer", "Value", "Status", "Date", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">No customer returns found</td></tr>
            ) : (
              paginated.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{r.returnNo}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.invoiceNo}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.customerName}</td>
                  <td className="px-4 py-3 text-zinc-600">Rs. {(r.totalValue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[r.status]?.cls || "badge-default"}`}>{STATUS_BADGE[r.status]?.label || r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => open(r.id)} className="nexora-btn nexora-btn-ghost py-1 px-2 text-xs">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {view && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Undo2 size={16} className="text-zinc-400" />
                <h2 className="font-prata text-lg">{view.returnNo}</h2>
                <span className={`badge ${STATUS_BADGE[view.status]?.cls || "badge-default"}`}>{STATUS_BADGE[view.status]?.label}</span>
              </div>
              <button onClick={() => setView(null)} className="text-zinc-400 hover:text-ink"><X size={18} /></button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Field label="Invoice" value={view.invoiceNo} />
                <Field label="Customer" value={`${view.customerName}${view.customerPhone ? ` · ${view.customerPhone}` : ""}`} />
                <Field label="Value" value={`Rs. ${(view.totalValue || 0).toLocaleString()}`} />
                <Field label="Accepted" value={`${formatDate(view.createdAt)} · ${view.createdByName}`} />
                <Field label="Outcome" value={outcomeLabel(view)} />
                {view.settledAt && <Field label="Settled" value={`${formatDate(view.settledAt)} · ${view.settledByName}`} />}
              </div>
              {view.note && <p className="text-xs text-zinc-500 mb-4 bg-zinc-50 rounded-lg px-3 py-2">Reason: {view.note}</p>}
              {view.settlementNote && <p className="text-xs text-zinc-500 mb-4 bg-zinc-50 rounded-lg px-3 py-2">Settlement: {view.settlementNote}</p>}

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-2 text-xs text-zinc-500 font-medium">Item</th>
                      <th className="text-center py-2 text-xs text-zinc-500 font-medium">Qty</th>
                      <th className="text-left py-2 text-xs text-zinc-500 font-medium">Condition</th>
                      <th className="text-left py-2 pl-4 text-xs text-zinc-500 font-medium">Serials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {view.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2.5">
                          <p className="font-medium text-ink">{item.productName}</p>
                          <p className="text-xs text-zinc-400">{item.sku} · Rs. {item.unitPrice.toLocaleString()} each</p>
                        </td>
                        <td className="py-2.5 text-center">{item.qty}</td>
                        <td className="py-2.5">
                          <span className={`badge ${item.condition === "good" ? "badge-success" : "badge-danger"}`}>
                            {item.condition === "good" ? "Good → Showroom" : "Damaged"}
                          </span>
                        </td>
                        <td className="py-2.5 pl-4 text-xs text-zinc-400 font-mono">
                          {item.serialNumbers?.join(", ") || "—"}
                          {item.replacementSerials?.length ? <span className="block text-emerald-600">→ {item.replacementSerials.join(", ")}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasDamaged && (
                <p className="text-xs text-zinc-500 mb-4">
                  Damaged items are in the damaged pool. To claim them from the supplier,{" "}
                  <Link href="/supplier-returns/new" className="underline">create a Supplier Return</Link> from &quot;Damaged&quot;.
                </p>
              )}

              {view.status === "pending" && canSettle && !settling && (
                <button onClick={startSettle} className="nexora-btn nexora-btn-primary text-xs">
                  <CheckCircle2 size={13} /> Settle Return
                </button>
              )}

              {settling && (
                <div className="nexora-card p-4 space-y-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">What does the customer get?</p>
                  <div className="flex flex-wrap gap-2">
                    {([["refund", "Money back"], ["replacement", "Same product, new unit"]] as const).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setForm({ ...form, type: v })} className={`nexora-btn text-xs ${form.type === v ? "nexora-btn-primary" : "nexora-btn-outline"}`}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {form.type === "refund" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Amount (Rs., max {(view.totalValue || 0).toLocaleString()})</label>
                        <input type="number" className="nexora-input" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Paid back by</label>
                        <select className="nexora-input" value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value as SalePaymentMethod })}>
                          {SALE_PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <p className="sm:col-span-2 text-xs text-zinc-400">
                        {shift
                          ? `Deducted from your open shift ${shift.shiftNo || ""} (${methodLabel(form.refundMethod)} takings).`
                          : "You have no open shift, so this refund won't be deducted from a cash drawer."}{" "}
                        Revenue for the original bill goes down by this amount.
                      </p>
                    </div>
                  )}

                  {form.type === "replacement" && (
                    <div className="space-y-3">
                      {serialItems.map((item: any) => (
                        <div key={item.id}>
                          <label className="text-xs text-zinc-500 mb-1 block">
                            Pick {item.qty} replacement serial(s) for {item.productName} from Showroom — {(form.serials[item.id] || []).length} selected
                          </label>
                          {(unitOptions[item.id] || []).length === 0 ? (
                            <p className="text-xs text-red-500">No units of this product are in Showroom. Transfer or receive stock first.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {unitOptions[item.id].map((sn) => (
                                <label key={sn} className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                                  <input type="checkbox" checked={(form.serials[item.id] || []).includes(sn)} onChange={() => toggleSerial(item.id, sn)} />
                                  {sn}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <p className="text-xs text-zinc-400">
                        The same quantity is taken from Showroom stock and given to the customer. Warranties move to the new serial numbers.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Note (optional)</label>
                    <input className="nexora-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleSettle} disabled={saving} className="nexora-btn nexora-btn-primary text-xs py-1.5 disabled:opacity-60">
                      {saving ? "Saving…" : "Confirm"}
                    </button>
                    <button onClick={() => setSettling(false)} className="nexora-btn nexora-btn-outline text-xs py-1.5">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
