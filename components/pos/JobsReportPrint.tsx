import React from "react";
import { jobServicesTotal } from "@/types";
import type { ShopSettings, JobStatusEntry } from "@/types";

// Landscape A4 report of every job matching the Jobs page filters — the PDF
// counterpart of the CSV "Export Report". Summary cards on top, then one
// readable row per job with its money columns and latest update.
//
// Styles are inline because html2canvas captures this off-screen. Table rows
// have no zebra striping on purpose: lib/pdf.ts looks for an almost fully
// white pixel row near each page break.

interface JobsReportPrintProps {
  jobs: any[];
  shop: ShopSettings;
  periodLabel: string;
  statusLabel: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Job Pending",
  ongoing: "Ongoing Job",
  done: "Job Done",
  ready: "Job Ready",
  delivered: "Delivered",
  unrepairable: "Can't Repair",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  pending: { bg: "#fffbeb", fg: "#b45309", border: "#fcd34d" },
  ongoing: { bg: "#f4f4f5", fg: "#3f3f46", border: "#d4d4d8" },
  done: { bg: "#f0fdf4", fg: "#15803d", border: "#86efac" },
  ready: { bg: "#ecfdf5", fg: "#047857", border: "#6ee7b7" },
  delivered: { bg: "#eff6ff", fg: "#1d4ed8", border: "#93c5fd" },
  unrepairable: { bg: "#fef2f2", fg: "#b91c1c", border: "#fca5a5" },
};

const STATUS_ORDER = ["pending", "ongoing", "ready", "delivered", "unrepairable"];

const ACCENT = "#dc2626";
const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#e4e4e7";

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(ts: any) {
  const d = toDate(ts);
  return d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function fmtTime(ts: any) {
  const d = toDate(ts);
  return d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
}

function rs(n: any) {
  return `Rs. ${(Number(n) || 0).toLocaleString("en-US")}`;
}

function clip(s: string | undefined, max: number) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

function jobMoney(job: any) {
  const services = job.services || [];
  const servicesTotal = jobServicesTotal(services);
  const finalCost = Number(job.repairCost ?? (services.length > 0 ? servicesTotal : job.estimatedCost)) || 0;
  const advance = Number(job.advancePaid) || 0;
  return {
    estimated: Number(job.estimatedCost) || 0,
    finalCost,
    finalised: job.repairCost != null,
    advance,
    balance: Math.max(0, finalCost - advance),
  };
}

function latestEntry(job: any): JobStatusEntry | null {
  const history: JobStatusEntry[] = job.statusHistory || [];
  let latest: JobStatusEntry | null = null;
  for (const h of history) {
    if (!latest || (toDate(h.createdAt)?.getTime() ?? 0) >= (toDate(latest.createdAt)?.getTime() ?? 0)) latest = h;
  }
  return latest;
}

// Coloured "●" + label, all plain text: html2canvas draws text a few px lower
// than the browser, so any box or shape next to text ends up misaligned in
// the PDF. A text bullet shifts together with the label.
function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.ongoing;
  return (
    <span style={{ color: c.fg, fontSize: "8.5pt", fontWeight: 600, whiteSpace: "nowrap" }}>
      {"● "}{STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Zero amounts print as a dash so the money columns are easy to scan.
function amt(n: number) {
  return n ? rs(n) : "—";
}

const th: React.CSSProperties = {
  padding: "2mm 2mm", textAlign: "left", fontSize: "7.5pt", fontWeight: 600, color: "#3f3f46",
  textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1.5px solid ${INK}`, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "2mm 2mm", fontSize: "9pt", color: INK, borderBottom: `1px solid ${LINE}`, verticalAlign: "top",
};
const num: React.CSSProperties = { textAlign: "right", whiteSpace: "nowrap" };
const sub: React.CSSProperties = { fontSize: "8pt", color: MUTED, marginTop: "0.4mm" };

export default function JobsReportPrint({ jobs, shop, periodLabel, statusLabel }: JobsReportPrintProps) {
  const generatedAt = new Date();
  // Oldest first reads naturally as a register; ties keep Firestore order.
  const rows = [...jobs].sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));

  const totals = rows.reduce(
    (t, j) => {
      const m = jobMoney(j);
      t.estimated += m.estimated;
      t.finalCost += m.finalCost;
      t.advance += m.advance;
      t.balance += m.balance;
      return t;
    },
    { estimated: 0, finalCost: 0, advance: 0, balance: 0 }
  );

  const counts: Record<string, number> = {};
  for (const j of rows) {
    // "done" is retired and shown as "ready" elsewhere in the app.
    const s = j.status === "done" ? "ready" : j.status;
    counts[s] = (counts[s] || 0) + 1;
  }

  return (
    <div
      id="jobs-report-print"
      style={{
        fontFamily: "'Poppins', sans-serif", padding: "12mm 12mm", width: "297mm", minHeight: "210mm",
        background: "#fff", color: INK, boxSizing: "border-box", lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6mm", paddingBottom: "4mm", borderBottom: `3px solid ${ACCENT}`, marginBottom: "5mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shop_logo/IMG_0112.PNG" alt={shop.name} style={{ height: "15mm", width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "16pt", fontWeight: 700, lineHeight: 1.15 }}>{shop.name}</div>
            {shop.address && <div style={{ fontSize: "8.5pt", color: MUTED, marginTop: "0.8mm" }}>{shop.address}</div>}
            <div style={{ fontSize: "8.5pt", color: MUTED }}>
              {[shop.phone && `Tel: ${shop.phone}`, shop.email].filter(Boolean).join("  |  ")}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1.15 }}>Jobs Report</div>
          <div style={{ fontSize: "9.5pt", color: INK, marginTop: "1mm" }}>
            <span style={{ color: MUTED }}>Period:</span> <b style={{ fontWeight: 600 }}>{periodLabel}</b>
          </div>
          <div style={{ fontSize: "9.5pt", color: INK }}>
            <span style={{ color: MUTED }}>Status:</span> <b style={{ fontWeight: 600 }}>{statusLabel}</b>
          </div>
          <div style={{ fontSize: "8pt", color: MUTED, marginTop: "0.8mm" }}>
            Generated {fmtDate(generatedAt)}, {fmtTime(generatedAt)}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "3mm", marginBottom: "3mm" }}>
        {[
          ["Total Jobs", String(rows.length), INK],
          ["Estimated Value", rs(totals.estimated), INK],
          ["Final Repair Value", rs(totals.finalCost), INK],
          ["Advance Collected", rs(totals.advance), "#15803d"],
          ["Balance Outstanding", rs(totals.balance), ACCENT],
        ].map(([label, value, color], i) => (
          <div key={label} style={{ border: `1px solid ${i === 4 ? ACCENT : LINE}`, borderRadius: "2mm", padding: "2.5mm 3mm" }}>
            <div style={{ fontSize: "7.5pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: "13pt", fontWeight: 700, color, marginTop: "0.6mm" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2.5mm", marginBottom: "5mm", fontSize: "9pt" }}>
        <span style={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "7.5pt" }}>By status:</span>
        {[...STATUS_ORDER, ...Object.keys(counts).filter((s) => !STATUS_ORDER.includes(s))]
          .filter((s) => counts[s])
          .map((s) => (
            <span key={s} style={{ marginRight: "4mm", whiteSpace: "nowrap" }}>
              <StatusPill status={s} /> <b style={{ marginLeft: "1mm" }}>{counts[s]}</b>
            </span>
          ))}
        {rows.length === 0 && <span style={{ color: MUTED }}>No jobs</span>}
      </div>

      {/* Jobs table */}
      {rows.length === 0 ? (
        <div style={{ fontSize: "11pt", color: MUTED, textAlign: "center", padding: "15mm 0" }}>No jobs match the selected filters.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "7mm" }} />
            <col style={{ width: "22mm" }} />
            <col style={{ width: "27mm" }} />
            <col style={{ width: "38mm" }} />
            <col style={{ width: "32mm" }} />
            <col />
            <col style={{ width: "26mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "19mm" }} />
            <col style={{ width: "20mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Job No</th>
              <th style={th}>Received</th>
              <th style={th}>Customer</th>
              <th style={th}>Device</th>
              <th style={th}>Fault / Latest Update</th>
              <th style={th}>Status</th>
              <th style={{ ...th, ...num }}>Estimated</th>
              <th style={{ ...th, ...num }}>Final Cost</th>
              <th style={{ ...th, ...num }}>Advance</th>
              <th style={{ ...th, ...num }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j, i) => {
              const m = jobMoney(j);
              const device = j.deviceType === "Other" ? j.deviceTypeOther : j.deviceType;
              const last = latestEntry(j);
              const phone = [j.customerPhone, j.customerPhone2].filter(Boolean).join(" / ");
              return (
                <tr key={j.id}>
                  <td style={{ ...td, color: MUTED }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{j.jobNo}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {fmtDate(j.createdAt)}
                    <div style={sub}>{fmtTime(j.createdAt)}</div>
                  </td>
                  <td style={{ ...td, wordBreak: "break-word" }}>
                    <div style={{ fontWeight: 600 }}>{j.customerName}</div>
                    {phone && <div style={sub}>{phone}</div>}
                  </td>
                  <td style={{ ...td, wordBreak: "break-word" }}>
                    {device || "—"}
                    {(j.brand || j.model) && <div style={sub}>{[j.brand, j.model].filter(Boolean).join(" ")}</div>}
                  </td>
                  <td style={{ ...td, wordBreak: "break-word" }}>
                    {clip(j.faultDescription, 110) || "—"}
                    {last?.note && (
                      <div style={sub}>
                        <b style={{ fontWeight: 600 }}>{fmtDate(last.createdAt)}:</b> {clip(last.note, 90)}
                      </div>
                    )}
                    {j.assignedTechnicianName && <div style={sub}>Tech: {j.assignedTechnicianName}</div>}
                  </td>
                  <td style={td}><StatusPill status={j.status === "done" ? "ready" : j.status} /></td>
                  <td style={{ ...td, ...num, color: m.estimated ? INK : MUTED }}>{amt(m.estimated)}</td>
                  <td style={{ ...td, ...num, color: m.finalCost ? INK : MUTED }}>{amt(m.finalCost)}</td>
                  <td style={{ ...td, ...num, color: m.advance ? "#15803d" : MUTED }}>{amt(m.advance)}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, color: m.balance > 0 ? ACCENT : MUTED }}>{amt(m.balance)}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={7} style={{ ...td, borderBottom: "none", borderTop: `1.5px solid ${INK}`, textAlign: "right", fontWeight: 700, textTransform: "uppercase", fontSize: "8.5pt", letterSpacing: "0.04em" }}>
                Totals ({rows.length} jobs)
              </td>
              <td style={{ ...td, ...num, borderBottom: "none", borderTop: `1.5px solid ${INK}`, fontWeight: 700 }}>{rs(totals.estimated)}</td>
              <td style={{ ...td, ...num, borderBottom: "none", borderTop: `1.5px solid ${INK}`, fontWeight: 700 }}>{rs(totals.finalCost)}</td>
              <td style={{ ...td, ...num, borderBottom: "none", borderTop: `1.5px solid ${INK}`, fontWeight: 700 }}>{rs(totals.advance)}</td>
              <td style={{ ...td, ...num, borderBottom: "none", borderTop: `1.5px solid ${INK}`, fontWeight: 700, color: ACCENT }}>{rs(totals.balance)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: "6mm", paddingTop: "2.5mm", borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", fontSize: "8pt", color: MUTED }}>
        <span>{shop.name} · Jobs Report · {periodLabel}</span>
        <span>Final cost = repair cost when set, otherwise services total or estimate. “—” = nothing recorded.</span>
      </div>
    </div>
  );
}
