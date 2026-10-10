"use client";

import { useState, type FormEvent } from "react";
import {
  complaintSources,
  deviationSources,
  eventStatus,
  type EventDisplayStatus,
  type IntakeKind,
} from "../../../lib/event-status";
import { eventDeleteBlocked, formatSignature, signatureList } from "../../../lib/part11-records";
import type { QualityEvent } from "../../../lib/quality-events";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function statusClass(status: EventDisplayStatus) {
  if (status === "Closed") return "license-current";
  if (status === "Overdue") return "license-due";
  return "license-soon";
}

function rank(status: EventDisplayStatus) {
  if (status === "Overdue") return 0;
  if (status === "Open") return 1;
  return 2;
}

const emptyForm: {
  kind: IntakeKind;
  openedOn: string;
  reportedBy: string;
  source: string;
  title: string;
  description: string;
  productOrProcess: string;
  owner: string;
  dueOn: string;
} = {
  kind: "Complaint",
  openedOn: "",
  reportedBy: "",
  source: complaintSources[0],
  title: "",
  description: "",
  productOrProcess: "",
  owner: "",
  dueOn: "",
};

export function ComplaintRegister({
  initialRecords,
  storageError,
}: {
  initialRecords: QualityEvent[];
  storageError?: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [message, setMessage] = useState(storageError ?? "");
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const today = localToday();
  const sources = form.kind === "Complaint" ? complaintSources : deviationSources;

  function replace(record: QualityEvent) {
    setRecords((current) => current.map((item) => item.id === record.id ? record : item));
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setMessage(result.error ?? "Could not open the CAPA.");
      return;
    }
    let record = result.record as QualityEvent;
    if (file) {
      const body = new FormData();
      body.set("id", record.id);
      body.set("file", file);
      const upload = await fetch("/api/complaints/file", { method: "POST", body });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) {
        setRecords((current) => [record, ...current]);
        setPending(false);
        setMessage(uploaded.error ?? "The CAPA opened, but the evidence file could not be uploaded.");
        return;
      }
      record = uploaded.record as QualityEvent;
    }
    setRecords((current) => [record, ...current]);
    setForm({ ...emptyForm, source: complaintSources[0] });
    setFile(null);
    setFileKey((key) => key + 1);
    setPending(false);
    setMessage(`${record.number} recorded. ${record.capaNumber} is open.`);
  }

  async function uploadFile(id: string, selected: File) {
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("id", id);
    body.set("file", selected);
    const response = await fetch("/api/complaints/file", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not upload the evidence file.");
      return;
    }
    replace(result.record);
    setMessage("Evidence file saved.");
  }

  async function removeFile(id: string) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/complaints/file?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not remove the evidence file.");
      return;
    }
    replace(result.record);
    setMessage("Evidence file removed.");
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this complaint or deviation and its CAPA?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/complaints/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete the record.");
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== id));
    setMessage("Record deleted.");
  }

  const overdue = records.filter((record) => eventStatus(record, today) === "Overdue").length;
  const ordered = [...records].sort((a, b) => {
    const byStatus = rank(eventStatus(a, today)) - rank(eventStatus(b, today));
    if (byStatus !== 0) return byStatus;
    return a.dueOn.localeCompare(b.dueOn);
  });

  return (
    <>
      <section className="report-section">
        <form onSubmit={createRecord} className="data-form">
          <h2>New complaint or deviation</h2>
          <div className="data-form-grid">
            <label>
              <span>Type</span>
              <select
                value={form.kind}
                onChange={(event) => {
                  const kind = event.target.value as IntakeKind;
                  const nextSources = kind === "Complaint" ? complaintSources : deviationSources;
                  setForm({ ...form, kind, source: nextSources[0] });
                }}
              >
                <option>Complaint</option>
                <option>Deviation</option>
              </select>
            </label>
            <label>
              <span>Source</span>
              <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
                {sources.map((source) => <option key={source}>{source}</option>)}
              </select>
            </label>
            <label>
              <span>Date opened</span>
              <input type="date" value={form.openedOn} onChange={(event) => setForm({ ...form, openedOn: event.target.value })} />
            </label>
            <label>
              <span>Reported by</span>
              <input value={form.reportedBy} onChange={(event) => setForm({ ...form, reportedBy: event.target.value })} placeholder="Alex Rivera" />
            </label>
            <label className="data-field-wide">
              <span>Title</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Damaged shipper reported by the customer" />
            </label>
            <label className="data-field-wide">
              <span>What happened</span>
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Where, when, and what was found." />
            </label>
            <label>
              <span>Product or process</span>
              <input value={form.productOrProcess} onChange={(event) => setForm({ ...form, productOrProcess: event.target.value })} placeholder="Lot 1042 / receiving" />
            </label>
            <label>
              <span>CAPA owner</span>
              <input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Quality manager" />
            </label>
            <label>
              <span>Target closure</span>
              <input type="date" value={form.dueOn} onChange={(event) => setForm({ ...form, dueOn: event.target.value })} />
            </label>
            <label>
              <span>Evidence file</span>
              <input key={fileKey} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button className="button button-dark" type="submit" disabled={pending}>Record and open CAPA</button>
        </form>
        <p className="fine-print">
          For a 5-Why or fishbone, use the <a href="/dashboard/qms/capa">CAPA / RCA toolkit</a>, then write the result on this CAPA.
        </p>
        {message ? <p className="fine-print" role="status">{message}</p> : null}
      </section>

      <section className="report-section">
        <h2>Register ({records.length})</h2>
        {overdue > 0 ? (
          <p className="fine-print">{overdue} {overdue === 1 ? "CAPA is" : "CAPAs are"} past the target closure date.</p>
        ) : null}
        {ordered.length === 0 ? <p className="fine-print">No complaints or deviations yet.</p> : ordered.map((record) => (
          <EventCard
            key={record.id}
            record={record}
            today={today}
            pending={pending}
            onReplace={replace}
            onMessage={setMessage}
            onPending={setPending}
            onUpload={uploadFile}
            onRemoveFile={removeFile}
            onDelete={removeRecord}
          />
        ))}
      </section>
    </>
  );
}

function EventCard({
  record,
  today,
  pending,
  onReplace,
  onMessage,
  onPending,
  onUpload,
  onRemoveFile,
  onDelete,
}: {
  record: QualityEvent;
  today: string;
  pending: boolean;
  onReplace: (record: QualityEvent) => void;
  onMessage: (message: string) => void;
  onPending: (pending: boolean) => void;
  onUpload: (id: string, file: File) => Promise<void>;
  onRemoveFile: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(record);
  const [password, setPassword] = useState("");
  const status = eventStatus(record, today);
  const closed = record.status === "Closed";
  const locked = eventDeleteBlocked(record);
  const signatures = signatureList(record.signatures);

  async function send(action: "save" | "close" | "reopen") {
    onPending(true);
    onMessage("");
    const response = await fetch(`/api/complaints/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "reopen" ? { action } : { ...draft, action, password: action === "close" ? password : "" }),
    });
    const result = await response.json().catch(() => ({}));
    onPending(false);
    if (!response.ok) {
      onMessage(result.error ?? "Could not update the CAPA.");
      return;
    }
    const next = result.record as QualityEvent;
    setDraft(next);
    setPassword("");
    onReplace(next);
    onMessage(action === "close" ? `${next.capaNumber} closed.` : action === "reopen" ? `${next.capaNumber} reopened.` : `${next.capaNumber} saved.`);
  }

  return (
    <article className="doc-card">
      <b>{record.number} · {record.kind} · {closed ? record.title : draft.title}</b>
      <span>{record.capaNumber} · Owner {record.owner} · Target {record.dueOn}</span>
      <span>Opened {record.openedOn} by {record.reportedBy} · {record.source}</span>
      {record.productOrProcess ? <span>{record.productOrProcess}</span> : null}
      <span><i className={statusClass(status)}>{status}</i>{closed && record.closedOn ? ` · Closed ${record.closedOn}` : ""}</span>
      {signatures.map((signature) => <span key={`${signature.signedAt}-${signature.userId}`}>Signed {formatSignature(signature)}</span>)}
      {record.fileName ? (
        <a href={`/api/complaints/file?id=${encodeURIComponent(record.id)}`}>{record.fileName}</a>
      ) : (
        <span>No evidence file yet.</span>
      )}
      {closed ? (
        <div className="data-form">
          <p>{record.title}</p>
          <p>{record.description}</p>
          {record.containment ? <p>Containment: {record.containment}</p> : null}
          <p>Root cause: {record.rootCause}</p>
          <p>Corrective action: {record.correctiveAction}</p>
          {record.preventiveAction ? <p>Preventive action: {record.preventiveAction}</p> : null}
          <p>Verification: {record.verification}</p>
          <button className="button button-outline" type="button" disabled={pending} onClick={() => void send("reopen")}>Reopen CAPA</button>
        </div>
      ) : (
        <form
          className="data-form"
          onSubmit={(event) => {
            event.preventDefault();
            void send("save");
          }}
        >
          <h2>{record.capaNumber}</h2>
          <div className="data-form-grid">
            <label className="data-field-wide">
              <span>Title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label className="data-field-wide">
              <span>What happened</span>
              <textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </label>
            <label>
              <span>Product or process</span>
              <input value={draft.productOrProcess} onChange={(event) => setDraft({ ...draft, productOrProcess: event.target.value })} />
            </label>
            <label>
              <span>CAPA owner</span>
              <input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} />
            </label>
            <label>
              <span>Target closure</span>
              <input type="date" value={draft.dueOn} onChange={(event) => setDraft({ ...draft, dueOn: event.target.value })} />
            </label>
            <label className="data-field-wide">
              <span>Containment</span>
              <textarea rows={2} value={draft.containment} onChange={(event) => setDraft({ ...draft, containment: event.target.value })} placeholder="What was done right away to contain the issue?" />
            </label>
            <label className="data-field-wide">
              <span>Root cause</span>
              <textarea rows={2} value={draft.rootCause} onChange={(event) => setDraft({ ...draft, rootCause: event.target.value })} placeholder="The verified cause." />
            </label>
            <label className="data-field-wide">
              <span>Corrective action</span>
              <textarea rows={2} value={draft.correctiveAction} onChange={(event) => setDraft({ ...draft, correctiveAction: event.target.value })} placeholder="What removes the cause?" />
            </label>
            <label className="data-field-wide">
              <span>Preventive action</span>
              <textarea rows={2} value={draft.preventiveAction} onChange={(event) => setDraft({ ...draft, preventiveAction: event.target.value })} placeholder="What keeps a similar issue from happening elsewhere?" />
            </label>
            <label className="data-field-wide">
              <span>Verification</span>
              <textarea rows={2} value={draft.verification} onChange={(event) => setDraft({ ...draft, verification: event.target.value })} placeholder="How you will know the action worked." />
            </label>
          </div>
          <button className="button button-dark" type="submit" disabled={pending}>Save CAPA</button>
          <label>
            <span>Password to sign the closure</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="button button-outline" type="button" disabled={pending} onClick={() => void send("close")}>Sign and close CAPA</button>
        </form>
      )}
      <div className="doc-actions">
        <label>
          {record.fileName ? "Replace evidence" : "Upload evidence"}
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
            disabled={pending}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = "";
              if (selected) void onUpload(record.id, selected);
            }}
          />
        </label>
        {record.fileName && !closed ? (
          <button type="button" disabled={pending} onClick={() => void onRemoveFile(record.id)}>Remove evidence</button>
        ) : null}
        {locked ? (
          <span>This CAPA stays on the register.</span>
        ) : (
          <button type="button" disabled={pending} onClick={() => void onDelete(record.id)}>Delete</button>
        )}
      </div>
    </article>
  );
}
