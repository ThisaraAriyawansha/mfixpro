import React from "react";
import { jobServicesTotal } from "@/types";
import type { ShopSettings, JobServiceItem, JobDevicePart, JobStatusEntry } from "@/types";

// A full, staff/customer-friendly A4 report of a single job: every field,
// the services breakdown, a payment summary and the complete status history.
// Unlike JobPrint (the short customer Job Note with signatures), this is meant
// to be read — larger type, clear sections, nothing left out.
//
// Styles are inline because html2canvas captures this off-screen. Wide
// coloured backgrounds are avoided on purpose: lib/pdf.ts looks for an almost
// fully white pixel row near each page break, so section bodies stay white.

interface JobReportPrintProps {
  job: any;
  shop: ShopSettings;
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

function fmtDateTime(ts: any) {
  const d = toDate(ts);
  return d
    ? d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
}

function rs(n: any) {
  return `Rs. ${(Number(n) || 0).toLocaleString("en-US")}`;
}

function StatusPill({ status, size = "md" }: { status: string; size?: "md" | "sm" }) {
  // Dot + label, not a bordered pill: html2canvas renders text lower than the
  // browser, which pushed pill text out of its box in the PDF.
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.ongoing;
  return (
    <span style={{ color: c.fg, fontSize: size === "md" ? "11pt" : "9pt", fontWeight: 600, whiteSpace: "nowrap" }}>
      {"● "}{STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Section({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "6mm" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "2.5mm", marginBottom: "3mm", paddingBottom: "1.5mm", borderBottom: `1.5px solid ${INK}` }}>
        {/* Plain text, not a filled circle — html2canvas shifts text down
            inside shapes, so a number in a circle renders off-centre. */}
        <span style={{ fontSize: "11.5pt", fontWeight: 700, color: ACCENT }}>{String(number).padStart(2, "0")}</span>
        <span style={{ fontSize: "11.5pt", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", color: INK }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined, minWidth: 0 }}>
      <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.8mm" }}>{label}</div>
      <div style={{ fontSize: "10.5pt", color: INK, fontWeight: 500, wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span style={{ fontSize: "10pt", color: MUTED }}>{empty}</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5mm" }}>
      {items.map((t) => (
        <span key={t} style={{ fontSize: "9.5pt", border: `1px solid #d4d4d8`, borderRadius: "999px", padding: "0.6mm 3mm", color: INK }}>
          {t}
        </span>
      ))}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "2mm 2.5mm", textAlign: "left", fontSize: "8.5pt", fontWeight: 600, color: "#3f3f46",
  textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid #a1a1aa`,
};
const td: React.CSSProperties = {
  padding: "2.2mm 2.5mm", fontSize: "10pt", color: INK, borderBottom: `1px solid ${LINE}`, verticalAlign: "top",
};

export default function JobReportPrint({ job, shop }: JobReportPrintProps) {
  const generatedAt = new Date();
  const device = job.deviceType === "Other" ? job.deviceTypeOther : job.deviceType;
  const services: JobServiceItem[] = job.services || [];
  const parts: JobDevicePart[] = job.parts || [];
  const history: JobStatusEntry[] = [...(job.statusHistory || [])].sort(
    (a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0)
  );

  const servicesTotal = jobServicesTotal(services);
  const freeCount = services.filter((s) => s.chargeType === "free").length;
  const finalCost = Number(job.repairCost ?? (services.length > 0 ? servicesTotal : job.estimatedCost)) || 0;
  const advance = Number(job.advancePaid) || 0;
  const balance = Math.max(0, finalCost - advance);
  const accessories = [...(job.accessories || []), job.accessoriesOther].filter(Boolean) as string[];
  const condition = (job.physicalCondition || []) as string[];
  const receivedBy = job.receivedByName?.includes("@") ? "Staff" : job.receivedByName;

  let n = 0;

  return (
    <div
      id="job-report-print"
      style={{
        fontFamily: "'Poppins', sans-serif", padding: "14mm 15mm", width: "210mm", minHeight: "297mm",
        background: "#fff", color: INK, boxSizing: "border-box", lineHeight: 1.45,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6mm", paddingBottom: "4mm", borderBottom: `3px solid ${ACCENT}`, marginBottom: "5mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4mm", minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shop_logo/IMG_0112.PNG" alt={shop.name} style={{ height: "18mm", width: "auto", objectFit: "contain" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "17pt", fontWeight: 700, lineHeight: 1.15 }}>{shop.name}</div>
            {shop.address && <div style={{ fontSize: "8.5pt", color: MUTED, marginTop: "1mm" }}>{shop.address}</div>}
            <div style={{ fontSize: "8.5pt", color: MUTED }}>
              {[shop.phone && `Tel: ${shop.phone}`, shop.email].filter(Boolean).join("  |  ")}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "9pt", color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Job Report</div>
          <div style={{ fontSize: "20pt", fontWeight: 700, lineHeight: 1.2, margin: "0.5mm 0 1.5mm" }}>{job.jobNo}</div>
          <StatusPill status={job.status} />
        </div>
      </div>

      {/* At-a-glance summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3mm", marginBottom: "6mm" }}>
        {[
          ["Received On", fmtDateTime(job.createdAt)],
          ["Expected Delivery", fmtDate(job.expectedDeliveryDate)],
          ["Technician", job.assignedTechnicianName || "Unassigned"],
          ["Balance Due", rs(balance)],
        ].map(([label, value], i) => (
          <div key={label} style={{ border: `1px solid ${i === 3 ? ACCENT : LINE}`, borderRadius: "2mm", padding: "2.5mm 3mm" }}>
            <div style={{ fontSize: "7.5pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: i === 3 ? "12pt" : "10pt", fontWeight: 700, color: i === 3 ? ACCENT : INK, marginTop: "0.8mm" }}>{value}</div>
          </div>
        ))}
      </div>

      <Section number={++n} title="Customer Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3.5mm 6mm" }}>
          <Field label="Name" value={job.customerName} />
          <Field label="Mobile" value={job.customerPhone} />
          <Field label="Mobile 2" value={job.customerPhone2} />
          <Field label="Company" value={job.customerCompany} />
          <Field label="Email" value={job.customerEmail} />
          <Field label="City" value={job.customerCity} />
          <Field label="Address" value={job.customerAddress} wide />
        </div>
      </Section>

      <Section number={++n} title="Device Information">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "3.5mm 5mm", marginBottom: parts.length ? "4mm" : 0 }}>
          <Field label="Device Type" value={device} />
          <Field label="Brand" value={job.brand} />
          <Field label="Model" value={job.model} />
          <Field label="Serial No." value={job.serialNo} />
          <Field label="Color" value={job.color} />
        </div>
        {parts.length > 0 && (
          <>
            <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1mm" }}>
              Internal Parts Recorded at Intake
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "8mm" }}>#</th>
                  <th style={th}>Part</th>
                  <th style={th}>Specification</th>
                  <th style={th}>Serial No.</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ ...td, color: MUTED }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                    <td style={td}>{p.spec || "—"}</td>
                    <td style={td}>{p.serialNo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Section>

      <Section number={++n} title="Problem & Intake Condition">
        <div style={{ marginBottom: "3.5mm" }}>
          <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1mm" }}>Fault / Customer Complaint</div>
          <div style={{ fontSize: "10.5pt", borderLeft: `3px solid ${ACCENT}`, paddingLeft: "3mm", whiteSpace: "pre-wrap" }}>
            {job.faultDescription || "—"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm", marginBottom: job.specialNotes ? "3.5mm" : 0 }}>
          <div>
            <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.2mm" }}>Accessories Received</div>
            <Chips items={accessories} empty="None" />
          </div>
          <div>
            <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.2mm" }}>Physical Condition</div>
            <Chips items={condition} empty="Not recorded" />
          </div>
        </div>
        {job.specialNotes && (
          <div>
            <div style={{ fontSize: "8pt", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1mm" }}>Special Notes</div>
            <div style={{ fontSize: "10pt", whiteSpace: "pre-wrap" }}>{job.specialNotes}</div>
          </div>
        )}
      </Section>

      <Section number={++n} title="Services & Charges">
        {services.length === 0 ? (
          <div style={{ fontSize: "10pt", color: MUTED }}>No itemised services recorded for this job.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "8mm" }}>#</th>
                <th style={th}>Service</th>
                <th style={{ ...th, width: "40mm" }}>Type</th>
                <th style={{ ...th, width: "32mm", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ ...td, color: MUTED }}>{i + 1}</td>
                  <td style={td}>{s.name}</td>
                  <td style={td}>
                    {s.chargeType === "free" ? (
                      <span style={{ color: "#15803d", fontWeight: 600 }}>
                        Free{s.freeReason ? <span style={{ color: MUTED, fontWeight: 400 }}> · {s.freeReason}</span> : null}
                      </span>
                    ) : (
                      "Paid"
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{s.chargeType === "free" ? "Rs. 0" : rs(s.price)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...td, borderBottom: "none", textAlign: "right", color: MUTED }}>
                  Services total{freeCount > 0 ? ` (${freeCount} free item${freeCount > 1 ? "s" : ""} excluded)` : ""}
                </td>
                <td style={{ ...td, borderBottom: "none", textAlign: "right", fontWeight: 700 }}>{rs(servicesTotal)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      <Section number={++n} title="Payment Summary">
        <div style={{ display: "flex", justifyContent: "flex-end", breakInside: "avoid" }}>
          <div style={{ width: "95mm" }}>
            {[
              ["Estimated cost (at intake)", rs(job.estimatedCost)],
              ...(services.length > 0 ? [["Services total", rs(servicesTotal)]] : []),
              ["Final repair cost", job.repairCost != null ? rs(job.repairCost) : `${rs(finalCost)} (not finalised)`],
              ["Less: advance paid", `- ${rs(advance)}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5pt", padding: "1.6mm 0", borderBottom: `1px dashed ${LINE}` }}>
                <span style={{ color: "#52525b" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2.5mm", padding: "2.5mm 3.5mm", border: `1.5px solid ${ACCENT}`, borderRadius: "2mm" }}>
              <span style={{ fontSize: "11pt", fontWeight: 700 }}>Balance Due</span>
              <span style={{ fontSize: "14pt", fontWeight: 700, color: ACCENT }}>{rs(balance)}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section number={++n} title="Job Progress & Activity">
        {history.length === 0 ? (
          <div style={{ fontSize: "10pt", color: MUTED }}>No status updates recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "40mm" }}>Date &amp; Time</th>
                <th style={{ ...th, width: "32mm" }}>Status</th>
                <th style={th}>Note</th>
                <th style={{ ...th, width: "30mm" }}>Updated By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={{ ...td, fontSize: "9.5pt" }}>{fmtDateTime(h.createdAt)}</td>
                  <td style={td}><StatusPill status={h.status} size="sm" /></td>
                  <td style={{ ...td, whiteSpace: "pre-wrap" }}>
                    {h.note || <span style={{ color: MUTED }}>—</span>}
                    {h.repairCost != null && (
                      <div style={{ fontSize: "9pt", color: MUTED, marginTop: "0.5mm" }}>Repair cost set: {rs(h.repairCost)}</div>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: "9.5pt" }}>{h.updatedByName?.includes("@") ? "Staff" : h.updatedByName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", gap: "8mm", fontSize: "9pt", color: MUTED, marginTop: "2.5mm" }}>
          <span>Received by: <b style={{ color: INK, fontWeight: 600 }}>{receivedBy || "—"}</b></span>
          {job.dateReturned && <span>Returned on: <b style={{ color: INK, fontWeight: 600 }}>{fmtDateTime(job.dateReturned)}</b></span>}
        </div>
      </Section>

      {/* Footer */}
      <div style={{ marginTop: "8mm", paddingTop: "3mm", borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", fontSize: "8pt", color: MUTED }}>
        <span>{shop.name} · Quality Repairs. Genuine Parts. Trusted Service.</span>
        <span>Generated {fmtDateTime(generatedAt)}</span>
      </div>
    </div>
  );
}
