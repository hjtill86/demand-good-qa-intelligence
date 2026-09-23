"use client";

import { useEffect, useState, type FormEvent } from "react";

const resources = ["metrics", "actions", "suppliers", "regulatory", "licenses", "digest"] as const;
type Resource = (typeof resources)[number];
type Field = { name: string; label: string; type?: "number" | "date" | "textarea"; placeholder?: string };
type RecordRow = { id: string; payload: Record<string, unknown> };

const fieldConfig: Record<Resource, Field[]> = {
  metrics: [
    { name: "qualityScore", label: "Overall quality score", type: "number", placeholder: "0–100" },
    { name: "qualityScoreChange", label: "Quality score change", placeholder: "e.g. 4.2% or No baseline" },
    { name: "compliantProducts", label: "Compliant products (%)", type: "number", placeholder: "0–100" },
    { name: "compliantProductsChange", label: "Compliant products change", placeholder: "e.g. 2.1% or No baseline" },
    { name: "openActions", label: "Open actions", type: "number" },
    { name: "actionsDue", label: "Actions due this week", type: "number" },
  ],
  actions: [
    { name: "title", label: "Action title", placeholder: "e.g. Review supplier certificate" },
    { name: "detail", label: "Details", placeholder: "Owner, supplier, batch, or context" },
    { name: "level", label: "Risk level", placeholder: "High, Medium, or Low" },
    { name: "due", label: "Due", placeholder: "e.g. Today or Sep 30" },
  ],
  suppliers: [
    { name: "name", label: "Supplier name" },
    { name: "category", label: "Category", placeholder: "e.g. Raw materials" },
    { name: "score", label: "Risk score", type: "number", placeholder: "0–100" },
    { name: "trend", label: "Trend", placeholder: "up, down, or flat" },
    { name: "note", label: "Notes", type: "textarea" },
  ],
  regulatory: [
    { name: "jurisdiction", label: "Jurisdiction", placeholder: "e.g. US · FDA" },
    { name: "title", label: "Update title" },
    { name: "impact", label: "Impact", placeholder: "High, Medium, or Low" },
    { name: "effectiveDate", label: "Effective date", type: "date" },
    { name: "summary", label: "Summary", type: "textarea" },
  ],
  licenses: [
    { name: "company", label: "Company" },
    { name: "documentName", label: "License or certificate name" },
    { name: "documentType", label: "Document type", placeholder: "License or Certification" },
    { name: "jurisdiction", label: "Jurisdiction" },
    { name: "licenseNumber", label: "Reference number" },
    { name: "expiresOn", label: "Expiration date", type: "date" },
    { name: "renewalLeadDays", label: "Alert lead time (days)", type: "number", placeholder: "30, 60, or 90" },
    { name: "status", label: "Status", placeholder: "Current, Renewal due, or Expiring soon" },
  ],
  digest: [
    { name: "headline", label: "Digest headline", placeholder: "What should the team know?" },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "bullets", label: "Key points (one per line)", type: "textarea" },
  ],
};

function emptyForm(resource: Resource) {
  return Object.fromEntries(fieldConfig[resource].map((field) => [field.name, ""]));
}

export function DataManager() {
  const [resource, setResource] = useState<Resource>("licenses");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm("licenses"));
  const [message, setMessage] = useState("");

  async function load(selected = resource) {
    const response = await fetch(`/api/data/${selected}`);
    const body = await response.json();
    setRecords(response.ok ? body : []);
    if (!response.ok) setMessage(body.error ?? "Could not load records.");
  }

  useEffect(() => {
    setForm(emptyForm(resource));
    setMessage("");
    void load(resource);
  }, [resource]);

  async function addRecord(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload: Record<string, unknown> = { ...form };
    for (const field of fieldConfig[resource]) {
      if (field.type === "number") payload[field.name] = Number(form[field.name]);
    }
    if (resource === "digest") {
      payload.bullets = form.bullets.split("\n").map((item) => item.trim()).filter(Boolean);
    }
    const missing = fieldConfig[resource].find((field) => !form[field.name].trim());
    if (missing) {
      setMessage(`Please complete: ${missing.label}.`);
      return;
    }
    const response = await fetch(`/api/data/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Could not save record.");
      return;
    }
    setForm(emptyForm(resource));
    setMessage("Record saved.");
    await load();
  }

  async function removeRecord(id: string) {
    const response = await fetch(`/api/data/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setMessage(body.error ?? "Could not delete record.");
      return;
    }
    setMessage("Record deleted.");
    await load();
  }

  return (
    <section className="report-section data-manager">
      <label htmlFor="data-resource"><b>What would you like to add?</b></label>
      <select id="data-resource" value={resource} onChange={(event) => setResource(event.target.value as Resource)}>
        {resources.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
      </select>

      <form onSubmit={addRecord} className="data-form">
        <h2>Add {resource}</h2>
        <div className="data-form-grid">
          {fieldConfig[resource].map((field) => (
            <label key={field.name} className={field.type === "textarea" ? "data-field-wide" : ""}>
              <span>{field.label}</span>
              {field.type === "textarea" ? (
                <textarea value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} placeholder={field.placeholder} rows={4} />
              ) : (
                <input type={field.type ?? "text"} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} placeholder={field.placeholder} />
              )}
            </label>
          ))}
        </div>
        <button className="button button-dark" type="submit">Save {resource}</button>
      </form>

      {message ? <p className="fine-print" role="status">{message}</p> : null}
      <h2>Current {resource} records ({records.length})</h2>
      {records.length === 0 ? <p className="fine-print">No records yet.</p> : records.map((record) => (
        <div className="action-row" key={record.id}>
          <div><b>{String(record.payload.title ?? record.payload.name ?? record.payload.documentName ?? record.payload.headline ?? "Saved record")}</b><span>{JSON.stringify(record.payload)}</span></div>
          <button type="button" onClick={() => void removeRecord(record.id)}>Delete</button>
        </div>
      ))}
    </section>
  );
}
