"use client";

import { useState, type FormEvent } from "react";
import { trainingStatus, type TrainingStatus } from "../../../lib/training-status";
import type { TrainingRecord } from "../../../lib/training-records";

export type TrainingDocumentOption = {
  id: string;
  documentNumber: string;
  title: string;
  currentRevisionId: string;
  revisions: { id: string; revision: string; status: string }[];
};

function statusClass(status: TrainingStatus) {
  if (status === "Current") return "license-current";
  if (status === "Retraining due") return "license-due";
  return "license-soon";
}

function rank(status: TrainingStatus) {
  if (status === "Retraining due") return 0;
  if (status === "Document removed") return 1;
  return 2;
}

export function TrainingRegister({
  initialRecords,
  documents,
  storageError,
}: {
  initialRecords: TrainingRecord[];
  documents: TrainingDocumentOption[];
  storageError?: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [message, setMessage] = useState(storageError ?? "");
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const first = documents[0];
  const [form, setForm] = useState({
    personName: "",
    role: "",
    trainer: "",
    trainedOn: "",
    documentId: first?.id ?? "",
    revisionId: first?.revisions[0]?.id ?? "",
  });

  const revisions = documents.find((document) => document.id === form.documentId)?.revisions ?? [];
  const due = records.filter((record) => trainingStatus(record, documents) === "Retraining due").length;

  function replace(record: TrainingRecord) {
    setRecords((current) => current.map((item) => item.id === record.id ? record : item));
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setMessage(result.error ?? "Could not save the training record.");
      return;
    }
    let record = result.record as TrainingRecord;
    if (file) {
      const body = new FormData();
      body.set("id", record.id);
      body.set("file", file);
      const upload = await fetch("/api/training/file", { method: "POST", body });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) {
        setRecords((current) => [record, ...current]);
        setPending(false);
        setMessage(uploaded.error ?? "Training saved, but the signed sheet could not be uploaded.");
        return;
      }
      record = uploaded.record as TrainingRecord;
    }
    setRecords((current) => [record, ...current]);
    setForm({
      personName: "",
      role: "",
      trainer: "",
      trainedOn: "",
      documentId: first?.id ?? "",
      revisionId: first?.revisions[0]?.id ?? "",
    });
    setFile(null);
    setFileKey((key) => key + 1);
    setPending(false);
    setMessage("Training record saved.");
  }

  async function uploadFile(id: string, selected: File) {
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("id", id);
    body.set("file", selected);
    const response = await fetch("/api/training/file", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not upload the signed sheet.");
      return;
    }
    replace(result.record);
    setMessage("Signed sheet saved.");
  }

  async function removeFile(id: string) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/training/file?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not remove the signed sheet.");
      return;
    }
    replace(result.record);
    setMessage("Signed sheet removed.");
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this training record and its signed sheet?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/training/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete the training record.");
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== id));
    setMessage("Training record deleted.");
  }

  const ordered = [...records].sort((a, b) => rank(trainingStatus(a, documents)) - rank(trainingStatus(b, documents)));

  return (
    <>
      <section className="report-section">
        {documents.length === 0 ? (
          storageError ? null : <p className="fine-print">Add a controlled document before recording training. <a href="/dashboard/documents">Open the document register</a>.</p>
        ) : (
          <form onSubmit={createRecord} className="data-form">
            <h2>New training record</h2>
            <div className="data-form-grid">
              <label>
                <span>Person</span>
                <input value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} placeholder="Alex Rivera" />
              </label>
              <label>
                <span>Role</span>
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Receiving technician" />
              </label>
              <label>
                <span>Trainer</span>
                <input value={form.trainer} onChange={(event) => setForm({ ...form, trainer: event.target.value })} placeholder="Quality manager" />
              </label>
              <label>
                <span>Date trained</span>
                <input type="date" value={form.trainedOn} onChange={(event) => setForm({ ...form, trainedOn: event.target.value })} />
              </label>
              <label className="data-field-wide">
                <span>Document revision</span>
                <select
                  value={`${form.documentId}|${form.revisionId}`}
                  onChange={(event) => {
                    const [documentId, revisionId] = event.target.value.split("|");
                    setForm({ ...form, documentId: documentId ?? "", revisionId: revisionId ?? "" });
                  }}
                >
                  {documents.flatMap((document) => document.revisions.map((revision) => (
                    <option key={revision.id} value={`${document.id}|${revision.id}`}>
                      {document.documentNumber} Rev {revision.revision} ({revision.status}) — {document.title}
                    </option>
                  )))}
                </select>
              </label>
              <label className="data-field-wide">
                <span>Signed sheet</span>
                <input key={fileKey} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
            <button className="button button-dark" type="submit" disabled={pending}>Save training</button>
          </form>
        )}
        {message ? <p className="fine-print" role="status">{message}</p> : null}
      </section>

      <section className="report-section">
        <h2>Training register ({records.length})</h2>
        {due > 0 ? <p className="fine-print">{due} {due === 1 ? "person is" : "people are"} due for retraining because a document revision changed.</p> : null}
        {ordered.length === 0 ? <p className="fine-print">No training records yet.</p> : ordered.map((record) => {
          const status = trainingStatus(record, documents);
          return (
            <article className="doc-card" key={record.id}>
              <b>{record.personName} · {record.role}</b>
              <span>{record.documentNumber} Rev {record.revision} · {record.documentTitle}</span>
              <span>Trained {record.trainedOn} · Trainer {record.trainer}</span>
              <span><i className={statusClass(status)}>{status}</i></span>
              {record.fileName ? (
                <a href={`/api/training/file?id=${encodeURIComponent(record.id)}`}>{record.fileName}</a>
              ) : (
                <span>No signed sheet yet.</span>
              )}
              <div className="doc-actions">
                <label>
                  {record.fileName ? "Replace sheet" : "Upload sheet"}
                  <input
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                    disabled={pending}
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      event.target.value = "";
                      if (selected) void uploadFile(record.id, selected);
                    }}
                  />
                </label>
                {record.fileName ? (
                  <button type="button" disabled={pending} onClick={() => void removeFile(record.id)}>Remove sheet</button>
                ) : null}
                <button type="button" disabled={pending} onClick={() => void removeRecord(record.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
