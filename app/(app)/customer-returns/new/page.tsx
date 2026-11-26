"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { findSaleForReturn, createCustomerReturn, type ReturnableLine } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import type { ReturnCondition } from "@/types";

interface Pick {
  qty: string;
  serials: string[];
  condition: ReturnCondition;
}

export default function NewCustomerReturnPage() {
  return (
    <Suspense>
      <NewCustomerReturn />
    </Suspense>
  );
}

function NewCustomerReturn() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, userDisplayName, can, loading: authLoading } = useAuth();
  const canCreate = can("customerReturns.create");

  const [invoice, setInvoice] = useState(params.get("invoice") || "");
  const [sale, setSale] = useState<any>(null);
  const [lines, setLines] = useState<ReturnableLine[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [note, setNote] = useState("");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (value = invoice) => {
    if (!value.trim()) return;
    setLooking(true);
    setError("");
    setSale(null);
    try {
      const res = await findSaleForReturn(value);
      setSale(res.sale);
      setLines(res.lines);
      setPicks(Object.fromEntries(res.lines.map((l) => [l.productId, { qty: "", serials: [], condition: "damaged" as ReturnCondition }])));
    } catch (err: any) {
      setError(err.message || "Bill not found.");
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (params.get("invoice")) lookup(params.get("invoice")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPick = (productId: string, patch: Partial<Pick>) => setPicks((p) => ({ ...p, [productId]: { ...p[productId], ...patch } }));

  const chosen = lines
    .map((l) => ({ line: l, pick: picks[l.productId] }))
    .map(({ line, pick }) => ({ line, pick, qty: line.serialNumbers.length > 0 ? pick?.serials.length ?? 0 : Number(pick?.qty) || 0 }))
    .filter((c) => c.qty > 0);
  const totalValue = chosen.reduce((t, c) => t + c.line.unitPrice * c.qty, 0);

  const handleSubmit = async () => {
    setError("");
    if (chosen.length === 0) { setError("Choose at least one item to return."); return; }
    for (const c of chosen) {
      const left = c.line.soldQty - c.line.returnedQty;
      if (c.qty > left) { setError(`Only ${left} of "${c.line.productName}" can still be returned.`); return; }
    }
    setSaving(true);
    try {
      await createCustomerReturn({
        saleId: sale.id,
        note,
        createdById: user!.uid,
        createdByName: userDisplayName || user?.email || "Unknown",
        items: chosen.map((c) => ({
          productId: c.line.productId,
          qty: c.qty,
          serialNumbers: c.line.serialNumbers.length > 0 ? c.pick.serials : undefined,
          condition: c.pick.condition,
        })),
      });
      router.push("/customer-returns");
    } catch (err: any) {
      setError(err.message || "Failed to save the return.");
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !canCreate) {
    return (
      <div className="p-4 sm:p-8">
        <div className="nexora-card p-8 text-center max-w-md mx-auto">
          <ShieldCheck size={24} className="text-zinc-300 mx-auto mb-3" />
          <h1 className="font-prata text-lg text-ink mb-1">Access Restricted</h1>
          <p className="text-sm text-zinc-500">You don't have permission to accept customer returns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/customer-returns" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink mb-4">
        <ArrowLeft size={14} /> Back to Customer Returns
      </Link>
      <h1 className="font-prata text-2xl text-ink mb-1">New Customer Return</h1>
      <p className="text-zinc-500 text-sm mb-8">
        Take back an item from a bill. Good items go back into Showroom stock. Damaged items go into the damaged pool, which you can send to the supplier. Settle the refund or replacement afterwards.
      </p>

      <div className="nexora-card p-4 sm:p-6 mb-6">
        <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Invoice Number</label>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); lookup(); }}
        >
          <input className="nexora-input" placeholder="e.g. INV-00012 or 12" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          <button type="submit" disabled={looking} className="nexora-btn nexora-btn-outline disabled:opacity-60">
            <Search size={14} /> {looking ? "Finding…" : "Find"}
          </button>
        </form>
        {!sale && error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {sale && (
        <>
          <div className="nexora-card p-4 sm:p-6 mb-6">
            <div className="flex flex-wrap justify-between gap-2 mb-4">
              <div>
                <p className="text-sm font-medium text-ink">{sale.invoiceNo} · {sale.customerName || "Walk-in Customer"}</p>
                <p className="text-xs text-zinc-400">
                  {sale.customerPhone ? `${sale.customerPhone} · ` : ""}
                  {sale.createdAt?.toDate?.().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}Total Rs. {(sale.totalAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Items being returned</p>
            <div className="space-y-3">
              {lines.map((l) => {
                const left = l.soldQty - l.returnedQty;
                const pick = picks[l.productId];
                const isSerial = l.serialNumbers.length > 0;
                return (
                  <div key={l.productId} className={`p-3 rounded-lg border ${left === 0 ? "border-zinc-100 opacity-50" : "border-zinc-200"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{l.productName}</p>
                        <p className="text-xs text-zinc-400">
                          {l.sku} · Sold {l.soldQty}{l.returnedQty ? ` · Already returned ${l.returnedQty}` : ""} · Rs. {l.unitPrice.toLocaleString()} each
                        </p>
                      </div>
                      {left > 0 && (
                        <select
                          className="nexora-input w-auto text-xs py-1.5"
                          value={pick?.condition}
                          onChange={(e) => setPick(l.productId, { condition: e.target.value as ReturnCondition })}
                        >
                          <option value="damaged">Damaged / faulty</option>
                          <option value="good">Good — can resell</option>
                        </select>
                      )}
                    </div>
                    {left === 0 ? (
                      <p className="text-xs text-zinc-400">Fully returned.</p>
                    ) : isSerial ? (
                      <div className="flex flex-wrap gap-2">
                        {l.serialNumbers.map((sn) => (
                          <label key={sn} className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                            <input
                              type="checkbox"
                              checked={pick?.serials.includes(sn)}
                              onChange={() =>
                                setPick(l.productId, {
                                  serials: pick.serials.includes(sn) ? pick.serials.filter((x) => x !== sn) : [...pick.serials, sn],
                                })
                              }
                            />
                            {sn}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Qty to return (max {left})</label>
                        <input
                          type="number"
                          min={0}
                          max={left}
                          className="nexora-input w-24 py-1.5"
                          value={pick?.qty}
                          onChange={(e) => setPick(l.productId, { qty: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="nexora-card p-4 sm:p-6 mb-6">
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Reason / Fault (optional)</label>
            <input className="nexora-input" placeholder="e.g. Subwoofer distorts at high volume" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={saving || chosen.length === 0}
            className="nexora-btn nexora-btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : `Accept Return${chosen.length ? ` · Rs. ${Math.round(totalValue).toLocaleString()}` : ""}`}
          </button>
        </>
      )}
    </div>
  );
}
