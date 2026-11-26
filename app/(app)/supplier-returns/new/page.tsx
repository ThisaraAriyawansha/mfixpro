"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProducts, getSuppliers, getAvailableUnits, createSupplierReturn, inventoryLocationLabel } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Product, Supplier, InventoryLocation } from "@/types";
import { Plus, Trash2, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import SearchableSelect from "@/components/ui/SearchableSelect";
import RefreshButton from "@/components/ui/RefreshButton";
import { useDraftState, clearDraft } from "@/hooks/useDraftState";

const DRAFT = "supplierReturnNew";

const STOCK_FIELD: Record<InventoryLocation, "showroomStock" | "storesStock" | "damagedStock"> = {
  showroom: "showroomStock",
  stores: "storesStock",
  damaged: "damagedStock",
};

interface DraftItem {
  tempId: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  serialNumbers?: string[];
}

export default function NewSupplierReturnPage() {
  const router = useRouter();
  const { user, userDisplayName, can, loading: authLoading } = useAuth();
  const canCreate = can("supplierReturns.create");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [location, setLocation] = useDraftState<InventoryLocation>(DRAFT, "location", "showroom");
  const [supplierId, setSupplierId] = useDraftState(DRAFT, "supplierId", "");
  const [note, setNote] = useDraftState(DRAFT, "note", "");
  const [items, setItems] = useDraftState<DraftItem[]>(DRAFT, "items", []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [availableUnits, setAvailableUnits] = useState<{ id: string; serialNumber: string }[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const loadData = (force = false) =>
    Promise.all([getProducts({ force }), getSuppliers()]).then(([p, s]) => {
      setProducts(p as Product[]);
      setSuppliers(s as Supplier[]);
    });

  useEffect(() => {
    loadData();
  }, []);

  const stockField = STOCK_FIELD[location];
  const stockOf = (p: Product) => ((p as any)[stockField] as number | undefined) ?? 0;
  const eligibleProducts = products.filter((p) => stockOf(p) > 0);
  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    setProductId("");
    setQty("");
    setSelectedSerials([]);
  }, [location]);

  useEffect(() => {
    if (!selectedProduct?.trackSerial) { setAvailableUnits([]); setSelectedSerials([]); return; }
    setLoadingUnits(true);
    getAvailableUnits(selectedProduct.id, location).then((units) => {
      setAvailableUnits(units as { id: string; serialNumber: string }[]);
      setSelectedSerials([]);
      setLoadingUnits(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, location]);

  const toggleSerial = (serial: string) =>
    setSelectedSerials((s) => (s.includes(serial) ? s.filter((x) => x !== serial) : [...s, serial]));

  const handleAddItem = () => {
    setError("");
    if (!selectedProduct) { setError("Choose a product."); return; }
    const alreadyAdded = items.filter((i) => i.productId === selectedProduct.id).reduce((t, i) => t + i.qty, 0);
    const available = stockOf(selectedProduct) - alreadyAdded;

    if (selectedProduct.trackSerial) {
      if (selectedSerials.length === 0) { setError("Select at least one serial number."); return; }
      const dup = selectedSerials.find((sn) => items.some((i) => i.serialNumbers?.includes(sn)));
      if (dup) { setError(`"${dup}" is already in the list.`); return; }
      setItems([...items, {
        tempId: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        qty: selectedSerials.length,
        serialNumbers: selectedSerials,
      }]);
    } else {
      const n = Number(qty);
      if (!qty || n <= 0) { setError("Enter a quantity."); return; }
      if (n > available) { setError(`Only ${available} available in ${inventoryLocationLabel(location)}.`); return; }
      setItems([...items, {
        tempId: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        qty: n,
      }]);
    }
    setProductId("");
    setQty("");
    setSelectedSerials([]);
  };

  const removeItem = (tempId: string) => setItems(items.filter((i) => i.tempId !== tempId));

  const handleSubmit = async () => {
    if (!supplierId) { setError("Choose the supplier you're returning to."); return; }
    if (items.length === 0) { setError("Add at least one item."); return; }
    setSaving(true);
    setError("");
    try {
      const supplier = suppliers.find((s) => s.id === supplierId);
      await createSupplierReturn({
        supplierId,
        supplierName: supplier?.name || "",
        location,
        note,
        createdById: user!.uid,
        createdByName: userDisplayName || user?.email || "Unknown",
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          qty: i.qty,
          serialNumbers: i.serialNumbers,
        })),
      });
      clearDraft(DRAFT, user!.uid);
      router.push("/supplier-returns");
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
          <p className="text-sm text-zinc-500">You don't have permission to create a supplier return.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/supplier-returns" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ink mb-4">
        <ArrowLeft size={14} /> Back to Supplier Returns
      </Link>
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="font-prata text-2xl text-ink">New Supplier Return</h1>
        <RefreshButton onRefresh={() => loadData(true)} />
      </div>
      <p className="text-zinc-500 text-sm mb-8">
        Send damaged or faulty stock back to the supplier. Stock is removed now. When the supplier responds, settle the return as a refund or a replacement.
      </p>

      <div className="nexora-card p-4 sm:p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Return From</label>
          <div className="flex flex-wrap gap-2">
            {(["showroom", "stores", "damaged"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`nexora-btn text-xs ${location === loc ? "nexora-btn-primary" : "nexora-btn-outline"}`}
              >
                {loc === "damaged" ? "Damaged (customer returns)" : inventoryLocationLabel(loc)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Supplier</label>
            <select className="nexora-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select a supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Note / Fault (optional)</label>
            <input className="nexora-input" placeholder="e.g. No sound, cracked cone" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="nexora-card p-4 sm:p-6 mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Add Item</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1">Product ({inventoryLocationLabel(location)} stock only)</label>
            <SearchableSelect
              value={productId}
              onChange={setProductId}
              placeholder={eligibleProducts.length ? "Select a product" : `Nothing in ${inventoryLocationLabel(location)}`}
              options={eligibleProducts.map((p) => ({
                id: p.id,
                label: `${p.name} (${p.sku}) — ${stockOf(p)} available`,
                sublabel: p.sku,
              }))}
            />
          </div>
          {selectedProduct?.trackSerial ? (
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1">Serial Numbers — {selectedSerials.length} selected</label>
              {loadingUnits ? (
                <p className="text-xs text-zinc-400 py-2">Loading…</p>
              ) : availableUnits.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">No serialized units available here.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-200 rounded-lg p-2">
                  {availableUnits.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-xs font-mono px-1 py-1 rounded hover:bg-zinc-50 cursor-pointer">
                      <input type="checkbox" checked={selectedSerials.includes(u.serialNumber)} onChange={() => toggleSerial(u.serialNumber)} />
                      {u.serialNumber}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : selectedProduct ? (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Quantity (max {stockOf(selectedProduct)})</label>
              <input type="number" className="nexora-input" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          ) : null}
        </div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button type="button" onClick={handleAddItem} className="nexora-btn nexora-btn-outline text-xs">
          <Plus size={13} /> Add Item
        </button>
      </div>

      {items.length > 0 && (
        <div className="nexora-card p-4 sm:p-6 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Items ({items.length})</p>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.tempId} className="flex items-center justify-between gap-2 p-3 bg-zinc-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-ink">{i.productName}</p>
                  <p className="text-xs text-zinc-400">
                    {i.sku} · Qty {i.qty}
                    {i.serialNumbers && <> · {i.serialNumbers.join(", ")}</>}
                  </p>
                </div>
                <button onClick={() => removeItem(i.tempId)} className="text-zinc-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || items.length === 0}
        className="nexora-btn nexora-btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Send to Supplier"}
      </button>
    </div>
  );
}
