"use client";
import { useEffect, useMemo, useState } from "react";
import { getServices, addService, updateService, deleteService } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Service, ServiceField, ServiceFieldType } from "@/types";
import { Plus, Edit2, Trash2, X, Search, Check, ArrowUp, ArrowDown, ListPlus } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AccessRestricted from "@/components/ui/AccessRestricted";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

const FIELD_TYPES: { value: ServiceFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long text" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
];

const typeLabel = (t: ServiceFieldType) => FIELD_TYPES.find(f => f.value === t)?.label ?? t;

// Dropdown options are edited as a comma-separated string so typing a comma
// doesn't get swallowed; they're split into an array on save.
type DraftField = {
  id: string;
  label: string;
  type: ServiceFieldType;
  required: boolean;
  placeholder: string;
  optionsText: string;
};

type FormState = {
  name: string;
  defaultPrice: string;
  description: string;
  active: boolean;
  fields: DraftField[];
};

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const emptyField = (): DraftField => ({
  id: newId(), label: "", type: "text", required: false, placeholder: "", optionsText: "",
});

const emptyForm = (): FormState => ({ name: "", defaultPrice: "", description: "", active: true, fields: [] });

const toDraft = (f: ServiceField): DraftField => ({
  id: f.id,
  label: f.label,
  type: f.type,
  required: !!f.required,
  placeholder: f.placeholder || "",
  optionsText: (f.options || []).join(", "),
});

// Firestore rejects `undefined`, so only type-relevant keys are written.
function toField(d: DraftField): ServiceField {
  const field: ServiceField = { id: d.id, label: d.label.trim(), type: d.type, required: d.required };
  if (["text", "number", "textarea"].includes(d.type) && d.placeholder.trim()) field.placeholder = d.placeholder.trim();
  if (d.type === "select") field.options = d.optionsText.split(",").map(o => o.trim()).filter(Boolean);
  return field;
}

export default function ServicesPage() {
  const { can } = useAuth();
  const canView = can("services.view");
  const canEdit = can("services.edit");
  const canDelete = can("services.delete");

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await getServices();
      setServices(data as Service[]);
      setLoadError("");
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q) ||
      (s.customFields || []).some(f => f.label.toLowerCase().includes(q))
    );
  }, [services, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);
  // Deleting the last row on the last page would otherwise leave an empty page.
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      defaultPrice: String(s.defaultPrice ?? ""),
      description: s.description || "",
      active: s.active !== false,
      fields: (s.customFields || []).map(toDraft),
    });
    setFormError("");
    setShowModal(true);
  };

  const updateField = (id: string, patch: Partial<DraftField>) =>
    setForm(f => ({ ...f, fields: f.fields.map(x => (x.id === id ? { ...x, ...patch } : x)) }));

  const removeField = (id: string) => setForm(f => ({ ...f, fields: f.fields.filter(x => x.id !== id) }));

  const moveField = (index: number, dir: -1 | 1) =>
    setForm(f => {
      const next = [...f.fields];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, fields: next };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const price = Number(form.defaultPrice);
    if (!form.name.trim()) return setFormError("Service name is required.");
    if (form.defaultPrice === "" || isNaN(price) || price < 0) return setFormError("Enter a valid default price.");

    const labels = new Set<string>();
    for (const d of form.fields) {
      const label = d.label.trim();
      if (!label) return setFormError("Every custom field needs a label.");
      if (labels.has(label.toLowerCase())) return setFormError(`Duplicate field label "${label}".`);
      labels.add(label.toLowerCase());
      if (d.type === "select" && d.optionsText.split(",").map(o => o.trim()).filter(Boolean).length < 2)
        return setFormError(`Dropdown "${label}" needs at least 2 options (comma separated).`);
    }

    const data: Omit<Service, "id" | "createdAt" | "updatedAt"> = {
      name: form.name.trim(),
      defaultPrice: price,
      description: form.description.trim(),
      active: form.active,
      customFields: form.fields.map(toField),
    };

    setSaving(true);
    try {
      if (editing) await updateService(editing.id, data);
      else await addService(data);
      setShowModal(false);
      load();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Service) => {
    setTogglingId(s.id);
    try {
      const active = s.active === false;
      await updateService(s.id, { active });
      setServices(prev => prev.map(x => (x.id === s.id ? { ...x, active } : x)));
    } catch (err: any) {
      alert(err?.message || "Failed to update service.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteService(deleteId);
      setDeleteId(null);
      load();
    } catch (err: any) {
      alert(err?.message || "Failed to delete service.");
    } finally {
      setDeleting(false);
    }
  };

  if (!canView) return <AccessRestricted message="You don't have permission to view Services." />;

  const previewFields = form.fields.filter(f => f.label.trim());

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-prata text-2xl text-ink">Services</h1>
          <p className="text-zinc-500 text-sm mt-1">{services.length} services</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="nexora-btn nexora-btn-primary self-start sm:self-auto">
            <Plus size={14} /> Add Service
          </button>
        )}
      </div>

      <div className="relative max-w-md mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          className="nexora-input pl-9"
          placeholder="Search by name, description or field…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="nexora-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Service</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Default Price</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Custom Fields</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-zinc-400">Loading…</td></tr>
            ) : loadError ? (
              <tr><td colSpan={5} className="text-center py-10 text-red-500">{loadError}</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-zinc-400">
                  {services.length === 0 ? "No services yet. Add your first service." : "No services found"}
                </td>
              </tr>
            ) : (
              paginated.map(s => {
                const active = s.active !== false;
                const fields = s.customFields || [];
                return (
                  <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{s.name}</p>
                      {s.description && <p className="text-xs text-zinc-400">{s.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">Rs. {Number(s.defaultPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {fields.length === 0 ? (
                        <span className="text-zinc-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map(f => (
                            <span key={f.id} className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                              {f.label}{f.required && <span className="text-brand">*</span>}
                              <span className="text-zinc-400">· {typeLabel(f.type)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={togglingId === s.id || !canEdit}
                        className="flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        title={!canEdit ? "You don't have permission to edit services." : active ? "Active. Click to deactivate." : "Inactive. Click to reactivate."}
                      >
                        <span className={`text-xs font-medium ${active ? "text-ink" : "text-zinc-300"}`}>Active</span>
                        <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${active ? "bg-green-500" : "bg-zinc-200"}`}>
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`}>
                            {active ? <Check size={10} className="text-green-600" strokeWidth={3} /> : <X size={10} className="text-zinc-400" strokeWidth={3} />}
                          </span>
                        </span>
                        <span className={`text-xs font-medium ${active ? "text-zinc-300" : "text-ink"}`}>Inactive</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {canEdit && (
                          <button onClick={() => openEdit(s)} className="nexora-btn nexora-btn-ghost p-1.5" title="Edit"><Edit2 size={13} /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteId(s.id)} className="nexora-btn nexora-btn-ghost p-1.5 text-red-500" title="Delete"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <h2 className="font-prata text-lg">{editing ? "Edit Service" : "Add Service"}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-zinc-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_280px]">
                {/* Editor */}
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Service Name</label>
                      <input className="nexora-input" required placeholder="e.g. Laptop Screen Replacement" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Default Price (Rs.)</label>
                      <input className="nexora-input" type="number" min="0" step="any" required value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Description</label>
                    <input className="nexora-input" placeholder="Optional" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                    <input type="checkbox" className="accent-brand" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                    Active
                  </label>

                  <div className="pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-3 mt-3">
                      <div>
                        <p className="text-sm font-medium text-ink">Custom Fields</p>
                        <p className="text-xs text-zinc-400">Inputs to fill in when this service is used, e.g. Model Number.</p>
                      </div>
                      <button type="button" onClick={() => setForm(f => ({ ...f, fields: [...f.fields, emptyField()] }))} className="nexora-btn nexora-btn-outline text-xs py-1.5">
                        <ListPlus size={13} /> Add Field
                      </button>
                    </div>

                    {form.fields.length === 0 && (
                      <div className="text-center py-6 text-xs text-zinc-400 border border-dashed border-zinc-200 rounded">
                        No custom fields. Click “Add Field” to create one.
                      </div>
                    )}

                    <div className="space-y-3">
                      {form.fields.map((f, i) => (
                        <div key={f.id} className="border border-zinc-200 rounded-lg p-3 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                              <div>
                                <label className="block text-xs text-zinc-500 mb-1">Label</label>
                                <input className="nexora-input" placeholder="e.g. Model Number" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-500 mb-1">Input Type</label>
                                <select className="nexora-input" value={f.type} onChange={e => updateField(f.id, { type: e.target.value as ServiceFieldType })}>
                                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 pt-5">
                              <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0} className="nexora-btn nexora-btn-ghost p-1 disabled:opacity-30" title="Move up"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => moveField(i, 1)} disabled={i === form.fields.length - 1} className="nexora-btn nexora-btn-ghost p-1 disabled:opacity-30" title="Move down"><ArrowDown size={12} /></button>
                            </div>
                            <button type="button" onClick={() => removeField(f.id)} className="nexora-btn nexora-btn-ghost p-1.5 mt-5 text-red-500" title="Remove field"><Trash2 size={13} /></button>
                          </div>

                          {(f.type === "text" || f.type === "number" || f.type === "textarea") && (
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Placeholder</label>
                              <input className="nexora-input" placeholder="Optional hint text" value={f.placeholder} onChange={e => updateField(f.id, { placeholder: e.target.value })} />
                            </div>
                          )}
                          {f.type === "select" && (
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Options (comma separated)</label>
                              <input className="nexora-input" placeholder="e.g. 13 inch, 14 inch, 15.6 inch" value={f.optionsText} onChange={e => updateField(f.id, { optionsText: e.target.value })} />
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                            <input type="checkbox" className="accent-brand" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} />
                            Required
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="px-6 py-4 bg-zinc-50 border-t lg:border-t-0 lg:border-l border-zinc-100">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Preview</p>
                  <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink text-sm">{form.name || "Service name"}</p>
                      <p className="text-sm font-medium whitespace-nowrap">Rs. {Number(form.defaultPrice || 0).toLocaleString()}</p>
                    </div>
                    {previewFields.length === 0 && <p className="text-xs text-zinc-400">No custom fields.</p>}
                    {previewFields.map(f => {
                      const label = <>{f.label}{f.required && <span className="text-brand"> *</span>}</>;
                      if (f.type === "checkbox") {
                        return (
                          <label key={f.id} className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" className="accent-brand" />
                            <span>{label}</span>
                          </label>
                        );
                      }
                      return (
                        <div key={f.id}>
                          <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                          {f.type === "textarea" ? (
                            <textarea className="nexora-input text-xs" rows={2} placeholder={f.placeholder} />
                          ) : f.type === "select" ? (
                            <select className="nexora-input text-xs" defaultValue="">
                              <option value="" disabled>Select…</option>
                              {f.optionsText.split(",").map(o => o.trim()).filter(Boolean).map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="nexora-input text-xs" type={f.type} placeholder={f.placeholder} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-zinc-100 shrink-0">
                {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="nexora-btn nexora-btn-primary flex-1 justify-center disabled:opacity-60">
                    {saving ? "Saving…" : editing ? "Update Service" : "Add Service"}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="nexora-btn nexora-btn-outline">Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete service?"
        message="This service and its custom fields will be permanently removed. This action cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
