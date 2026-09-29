"use client";
import { useEffect, useRef, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { getCustomersPage, countCustomers, addCustomer, updateCustomer } from "@/lib/firestore";
import { Customer } from "@/types";
import { Plus, Edit2, X, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerSearch } from "@/hooks/useCustomerSearch";
import Pagination from "@/components/ui/Pagination";
import AccessRestricted from "@/components/ui/AccessRestricted";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { can } = useAuth();
  const canView = can("customers.view");
  // Only the current A–Z page is fetched (see loadPage); search goes to
  // Firestore too, so the directory never downloads every customer.
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const cursorsRef = useRef<(QueryDocumentSnapshot | null)[]>([null]);
  const loadReqRef = useRef(0);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", phone2: "", email: "", address: "" });

  const { results: searchResults, searching, refresh: refreshSearch } = useCustomerSearch(search, 30);
  const isSearching = search.trim().length >= 2;

  // Pages are reached one step at a time, so page p's start cursor is known.
  async function loadPage(p: number) {
    const req = ++loadReqRef.current;
    setLoading(true);
    const { rows, cursor } = await getCustomersPage(PAGE_SIZE, cursorsRef.current[p - 1] ?? null);
    if (req !== loadReqRef.current) return;
    cursorsRef.current[p] = cursor;
    setCustomers(rows as Customer[]);
    setLoading(false);
  }

  function load() {
    countCustomers().then(setTotalCustomers).catch(() => {});
    return loadPage(page);
  }

  const goToPage = (p: number) => {
    setPage(p);
    loadPage(p);
  };

  useEffect(() => {
    if (!canView) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const openAdd = () => { setEditing(null); setForm({ name: "", phone: "", phone2: "", email: "", address: "" }); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone, phone2: c.phone2 || "", email: c.email || "", address: c.address || "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await updateCustomer(editing.id, form);
    else await addCustomer(form);
    setShowModal(false);
    if (editing) {
      load();
    } else {
      // A new name can land on any A–Z page, so restart from page 1.
      cursorsRef.current = [null];
      setPage(1);
      countCustomers().then(setTotalCustomers).catch(() => {});
      loadPage(1);
    }
    if (isSearching) refreshSearch();
  };

  const filtered = isSearching ? searchResults : customers;
  const listLoading = isSearching ? searching : loading;

  if (!canView) return <AccessRestricted message="You don't have permission to view Customers." />;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-prata text-2xl text-ink">Customers</h1>
          <p className="text-zinc-500 text-sm mt-1">{totalCustomers} customers</p>
        </div>
        <button onClick={openAdd} className="nexora-btn nexora-btn-primary self-start sm:self-auto">
          <Plus size={14} /> Add Customer
        </button>
      </div>

      <div className="relative mb-4 sm:max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          className="nexora-input pl-9"
          placeholder="Search by name or phone (start of it)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="nexora-card overflow-hidden">
        <div className="divide-y divide-zinc-50">
          {listLoading ? (
            <p className="text-center py-12 text-sm text-zinc-400">{isSearching ? "Searching…" : "Loading…"}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-zinc-400">No customers found</p>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-zinc-400">{[c.phone, c.phone2].filter(Boolean).join(" / ")} {c.email ? `· ${c.email}` : ""}</p>
                  {c.address && <p className="text-xs text-zinc-400">{c.address}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">{c.loyaltyPoints || 0} pts</span>
                  <button onClick={() => openEdit(c)} className="nexora-btn nexora-btn-ghost p-1.5"><Edit2 size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!isSearching && (
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(totalCustomers / PAGE_SIZE))}
          totalItems={totalCustomers}
          pageSize={PAGE_SIZE}
          onPageChange={goToPage}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-prata text-lg">{editing ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              <input className="nexora-input" required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="nexora-input" required placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <input className="nexora-input" placeholder="Phone number 2 (optional)" value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })} />
              <input className="nexora-input" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="nexora-input" placeholder="Address (optional)" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <button type="submit" className="nexora-btn nexora-btn-primary w-full justify-center">{editing ? "Update Customer" : "Add Customer"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
