"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSupplierReturns, getSupplierReturn, settleSupplierReturn, dateInputRange, inventoryLocationLabel,
} from "@/lib/firestore";
import { daysAgoInput, todayInput, DEFAULT_LIST_DAYS } from "@/lib/dates";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Eye, X, PackageX, Download, CheckCircle2 } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { rowsToCSV, downloadCSV } from "@/lib/csv";
import AccessRestricted from "@/components/ui/AccessRestricted";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: "badge-warning", label: "At Supplier" },
  settled: { cls: "badge-success", label: "Settled" },
  rejected: { cls: "badge-danger", label: "Rejected" },
};

function settlementLabel(r: any) {
  if (r.status === "pending") return "Waiting for supplier";
  if (r.status === "rejected") return "Rejected — written off";
  if (r.settlementType === "replacement") return `Replacement → ${inventoryLocationLabel(r.replacementLocation)}`;
  return `Refund Rs. ${(r.refundAmount ?? 0).toLocaleString()} (${r.refundMode === "cash" ? "cash back" : "credit to account"})`;
}

export default function SupplierReturnsPage() {
  const { user, userDisplayName, can } = useAuth();
  const canView = can("supplierReturns.view");
  const canCreate = can("supplierReturns.create");
  const canSettle = can("supplierReturns.settle");

  const [returns, setReturns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "settled" | "rejected">("");
  const [fromDate, setFromDate] = useState(daysAgoInput(DEFAULT_LIST_DAYS));
  const [toDate, setToDate] = useState(todayInput());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<any>(null);

  const [settling, setSettling] = useState(false);
  const [form, setForm] = useState({
    type: "refund" as "refund" | "replacement" | "rejected",
    refundMode: "credit" as "credit" | "cash",
    refundAmount: "",
    replacementLocation: "stores" as "stores" | "showroom",
    serials: {} as Record<string, string>,
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => getSupplierReturns(dateInputRange(fromDate, toDate)).then((r) => { setReturns(r); setLoading(false); });

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, fromDate, toDate]);

  useEffect(() => setPage(1), [search, statusFilter, fromDate, toDate]);

  const open = async (id: string) => {
    setView(await getSupplierReturn(id));
    setSettling(false);
    setError("");
  };

  const startSettle = () => {
    setForm({
      type: "refund",
      refundMode: "credit",
      refundAmount: String(view.totalValue ?? ""),
      replacementLocation: view.location === "showroom" ? "showroom" : "stores",
      serials: {},
      note: "",
    });
    setError("");
    setSettling(true);
  };

  const handleSettle = async () => {
    setSaving(true);
    setError("");
    try {
      await settleSupplierReturn(view.id, {
        type: form.type,
        refundMode: form.refundMode,
        refundAmount: Number(form.refundAmount),
        replacementLocation: form.replacementLocation,
        replacementSerials: Object.fromEntries(
          Object.entries(form.serials).map(([k, v]) => [k, v.split("\n").map((s) => s.trim()).filter(Boolean)])
        ),
        note: form.note,
        performedBy: { uid: user!.uid, name: userDisplayName || user?.email || "Unknown" },
      });
      setView(await getSupplierReturn(view.id));
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
      (r.returnNo?.toLowerCase().includes(q) || r.supplierName?.toLowerCase().includes(q) || r.createdByName?.toLowerCase().includes(q))
  );
  const pendingCount = returns.filter((r) => r.status === "pending").length;
  const pendingValue = returns.filter((r) => r.status === "pending").reduce((t, r) => t + (r.totalValue || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleExportCSV = () => {
    downloadCSV(
      `supplier-returns-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCSV(
        filtered.map((r) => ({
          "Return No.": r.returnNo,
          Supplier: r.supplierName,
          From: inventoryLocationLabel(r.location),
          Value: r.totalValue,
          Status: STATUS_BADGE[r.status]?.label || r.status,
          Outcome: settlementLabel(r),
          "Created By": r.createdByName,
          Note: r.note || "",
          Date: r.createdAt,
        }))
      )
    );
  };

  if (!canView) return <AccessRestricted message="You don't have permission to view Supplier Returns." />;

  const serialItems = (view?.items ?? []).filter((i: any) => (i.serialNumbers?.length ?? 0) > 0);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-prata text-2xl text-ink">Supplier Returns</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {pendingCount > 0
              ? `${pendingCount} waiting at supplier · Rs. ${pendingValue.toLocaleString()} to recover`
              : `${returns.length} returns recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={handleExportCSV} disabled={filtered.length === 0} className="nexora-btn nexora-btn-outline disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} /> Download CSV
          </button>
          {canCreate && (
            <Link href="/supplier-returns/new" className="nexora-btn nexora-btn-primary">
              <Plus size={14} /> New Return
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="nexora-input pl-9" placeholder="Search no., supplier, or staff…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="nexora-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="">All statuses</option>
          <option value="pending">At Supplier</option>
          <option value="settled">Settled</option>
          <option value="rejected">Rejected</option>
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
              {["No.", "Supplier", "From", "Value", "Status", "Date", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">No supplier returns found</td></tr>
            ) : (
              paginated.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{r.returnNo}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.supplierName}</td>
                  <td className="px-4 py-3 text-zinc-600">{inventoryLocationLabel(r.location)}</td>
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
                <PackageX size={16} className="text-zinc-400" />
                <h2 className="font-prata text-lg">{view.returnNo}</h2>
                <span className={`badge ${STATUS_BADGE[view.status]?.cls || "badge-default"}`}>{STATUS_BADGE[view.status]?.label}</span>
              </div>
              <button onClick={() => setView(null)} className="text-zinc-400 hover:text-ink"><X size={18} /></button>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Field label="Supplier" value={view.supplierName} />
                <Field label="Returned From" value={inventoryLocationLabel(view.location)} />
                <Field label="Value (cost)" value={`Rs. ${(view.totalValue || 0).toLocaleString()}`} />
                <Field label="Created" value={`${formatDate(view.createdAt)} · ${view.createdByName}`} />
                <Field label="Outcome" value={settlementLabel(view)} />
                {view.settledAt && <Field label="Settled" value={`${formatDate(view.settledAt)} · ${view.settledByName}`} />}
              </div>
              {view.note && <p className="text-xs text-zinc-500 mb-4 bg-zinc-50 rounded-lg px-3 py-2">Fault: {view.note}</p>}
              {view.settlementNote && <p className="text-xs text-zinc-500 mb-4 bg-zinc-50 rounded-lg px-3 py-2">Settlement: {view.settlementNote}</p>}

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-2 text-xs text-zinc-500 font-medium">Item</th>
                      <th className="text-center py-2 text-xs text-zinc-500 font-medium">Qty</th>
                      <th className="text-right py-2 text-xs text-zinc-500 font-medium">Cost</th>
                      <th className="text-left py-2 pl-4 text-xs text-zinc-500 font-medium">Serials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {view.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2.5">
                          <p className="font-medium text-ink">{item.productName}</p>
                          <p className="text-xs text-zinc-400">{item.sku}</p>
                        </td>
                        <td className="py-2.5 text-center">{item.qty}</td>
                        <td className="py-2.5 text-right">Rs. {Math.round(item.costPrice * item.qty).toLocaleString()}</td>
                        <td className="py-2.5 pl-4 text-xs text-zinc-400 font-mono">
                          {item.serialNumbers?.join(", ") || "—"}
                          {item.replacementSerials?.length ? <span className="block text-emerald-600">→ {item.replacementSerials.join(", ")}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {view.status === "pending" && canSettle && !settling && (
                <button onClick={startSettle} className="nexora-btn nexora-btn-primary text-xs">
                  <CheckCircle2 size={13} /> Settle Return
                </button>
              )}

              {settling && (
                <div className="nexora-card p-4 space-y-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">What did the supplier do?</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["refund", "Gave money / credit"],
                      ["replacement", "Gave a replacement"],
                      ["rejected", "Rejected the claim"],
                    ] as const).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setForm({ ...form, type: v })} className={`nexora-btn text-xs ${form.type === v ? "nexora-btn-primary" : "nexora-btn-outline"}`}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {form.type === "refund" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">How</label>
                        <select className="nexora-input" value={form.refundMode} onChange={(e) => setForm({ ...form, refundMode: e.target.value as any })}>
                          <option value="credit">Credit — reduce what we owe</option>
                          <option value="cash">Cash / bank — they paid us back</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Amount (Rs.)</label>
                        <input type="number" className="nexora-input" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} />
                      </div>
                      <p className="sm:col-span-2 text-xs text-zinc-400">
                        {form.refundMode === "credit"
                          ? "The supplier's payable balance goes down by this amount. If it goes below zero, the supplier owes you."
                          : "Recorded as money returned to you. The supplier balance stays the same."}
                      </p>
                    </div>
                  )}

                  {form.type === "replacement" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Receive replacement into</label>
                        <div className="flex gap-2">
                          {(["stores", "showroom"] as const).map((loc) => (
                            <button key={loc} type="button" onClick={() => setForm({ ...form, replacementLocation: loc })} className={`nexora-btn text-xs ${form.replacementLocation === loc ? "nexora-btn-primary" : "nexora-btn-outline"}`}>
                              {inventoryLocationLabel(loc)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {serialItems.map((item: any) => (
                        <div key={item.id}>
                          <label className="text-xs text-zinc-500 mb-1 block">New serial numbers for {item.productName} ({item.qty}, one per line)</label>
                          <textarea
                            className="nexora-input resize-none font-mono text-xs"
                            rows={Math.min(4, Math.max(2, item.qty))}
                            value={form.serials[item.id] || ""}
                            onChange={(e) => setForm({ ...form, serials: { ...form.serials, [item.id]: e.target.value } })}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-zinc-400">The same items and quantities are added back at the original cost. The supplier balance does not change.</p>
                    </div>
                  )}

                  {form.type === "rejected" && (
                    <p className="text-xs text-zinc-400">The items stay out of stock and their cost (Rs. {(view.totalValue || 0).toLocaleString()}) is written off as a loss.</p>
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
