"use client";

import { useEffect, useState } from "react";

const resources = ["metrics", "actions", "suppliers", "regulatory", "licenses", "digest"] as const;
type Resource = (typeof resources)[number];

export function DataManager() {
  const [resource, setResource] = useState<Resource>("licenses");
  const [records, setRecords] = useState<{ id: string; payload: Record<string, unknown> }[]>([]);
  const [value, setValue] = useState("{}");
  const [message, setMessage] = useState("");

  async function load(selected = resource) {
    const response = await fetch(`/api/data/${selected}`);
    const body = await response.json();
    setRecords(response.ok ? body : []);
    if (!response.ok) setMessage(body.error ?? "Could not load data.");
  }

  useEffect(() => { void load(); }, [resource]);

  async function addRecord(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    let payload: unknown;
    try { payload = JSON.parse(value); } catch { setMessage("Enter valid JSON."); return; }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) { setMessage("Each record must be a JSON object."); return; }
    const response = await fetch(`/api/data/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Could not save record."); return; }
    setValue("{}");
    setMessage("Record saved.");
    await load();
  }

  async function removeRecord(id: string) {
    const response = await fetch(`/api/data/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json(); setMessage(body.error ?? "Could not delete record."); return; }
    setMessage("Record deleted.");
    await load();
  }

  return (
    <section className="report-section">
      <label htmlFor="data-resource"><b>Data type</b></label>
      <select id="data-resource" value={resource} onChange={(event) => setResource(event.target.value as Resource)}>
        {resources.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <form onSubmit={addRecord}>
        <label htmlFor="data-json"><b>Add {resource} record as JSON</b></label>
        <textarea id="data-json" value={value} onChange={(event) => setValue(event.target.value)} rows={8} placeholder='{"company":"Example","documentName":"ISO certificate"}' />
        <button className="button button-dark" type="submit">Save record</button>
      </form>
      {message ? <p className="fine-print" role="status">{message}</p> : null}
      <h2>Current {resource} records ({records.length})</h2>
      {records.length === 0 ? <p className="fine-print">No records yet.</p> : records.map((record) => (
        <div className="action-row" key={record.id}>
          <code>{JSON.stringify(record.payload)}</code>
          <button type="button" onClick={() => void removeRecord(record.id)}>Delete</button>
        </div>
      ))}
    </section>
  );
}
