"use client";

import { useState, type FormEvent } from "react";
import { confidentialLines } from "../../../lib/confidential-statement";
import type { ControlledDocument } from "../../../lib/controlled-documents";

const types = ["SOP", "Work instruction", "Policy", "Form"] as const;

function statusClass(status: ControlledDocument["current"]["status"]) {
  return status === "Approved" ? "license-current" : status === "Draft" ? "license-soon" : "license-due";
}

function fileHref(documentId: string, revisionId: string) {
  return `/api/documents/file?id=${encodeURIComponent(documentId)}&revision=${encodeURIComponent(revisionId)}`;
}

export function DocumentRegister({
  initialDocuments,
  organizationName = "",
  storageError,
}: {
  initialDocuments: ControlledDocument[];
  organizationName?: string;
  storageError?: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [message, setMessage] = useState(storageError ?? "");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ documentNumber: "", title: "", documentType: "SOP", owner: "", revision: "1" });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approver, setApprover] = useState("");
  const [effectiveOn, setEffectiveOn] = useState("");
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [nextRevision, setNextRevision] = useState("");

  function replace(document: ControlledDocument) {
    setDocuments((current) => current.map((item) => item.id === document.id ? document : item));
  }

  async function createDocument(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setMessage(result.error ?? "Could not save the document.");
      return;
    }
    let document = result.document as ControlledDocument;
    if (file) {
      const body = new FormData();
      body.set("id", document.id);
      body.set("file", file);
      const upload = await fetch("/api/documents/file", { method: "POST", body });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) {
        setDocuments((current) => [document, ...current]);
        setPending(false);
        setMessage(uploaded.error ?? "Document saved, but the file could not be uploaded.");
        return;
      }
      document = uploaded.document as ControlledDocument;
    }
    setDocuments((current) => [document, ...current]);
    setForm({ documentNumber: "", title: "", documentType: "SOP", owner: "", revision: "1" });
    setFile(null);
    setFileKey((key) => key + 1);
    setPending(false);
    setMessage("Draft saved.");
  }

  async function uploadFile(id: string, selected: File) {
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("id", id);
    body.set("file", selected);
    const response = await fetch("/api/documents/file", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not upload the file.");
      return;
    }
    replace(result.document);
    setMessage("File saved on this draft.");
  }

  async function act(id: string, payload: Record<string, string>) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not update the document.");
      return;
    }
    replace(result.document);
    setApprovingId(null);
    setRevisingId(null);
    setMessage("Document updated.");
  }

  async function remove(id: string) {
    if (!confirm("Delete this document and its retired revisions?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete the document.");
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== id));
    setMessage("Document deleted.");
  }

  return (
    <>
      <section className="report-section">
        <form onSubmit={createDocument} className="data-form">
          <h2>New controlled document</h2>
          <div className="data-form-grid">
            <label>
              <span>Document number</span>
              <input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="SOP-001" />
            </label>
            <label>
              <span>Title</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Receiving inspection" />
            </label>
            <label>
              <span>Type</span>
              <select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
                {types.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Owner</span>
              <input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Quality manager" />
            </label>
            <label>
              <span>Revision</span>
              <input value={form.revision} onChange={(event) => setForm({ ...form, revision: event.target.value })} placeholder="1" />
            </label>
            <label>
              <span>File</span>
              <input key={fileKey} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button className="button button-dark" type="submit" disabled={pending}>Save draft</button>
        </form>
        {message ? <p className="fine-print" role="status">{message}</p> : null}
      </section>

      <section className="report-section">
        <h2>Current register ({documents.length})</h2>
        {documents.length === 0 ? <p className="fine-print">No controlled documents yet.</p> : documents.map((document) => (
          <article className="doc-card" key={document.id}>
            <div>
              <b>{document.documentNumber} · {document.title}</b>
              <span>{document.documentType} · Owner {document.owner || "—"} · Rev {document.current.revision}</span>
              <span>
                <i className={statusClass(document.current.status)}>{document.current.status}</i>
                {document.current.approver ? ` · Approved by ${document.current.approver} on ${document.current.approvedOn}` : ""}
                {document.current.effectiveOn ? ` · Effective ${document.current.effectiveOn}` : ""}
                {document.current.retiredOn ? ` · Retired ${document.current.retiredOn}` : ""}
              </span>
              {document.current.fileName ? (
                <a href={fileHref(document.id, document.current.id)}>{document.current.fileName}</a>
              ) : (
                <span>No file on this revision yet.</span>
              )}
              {document.history.length > 0 ? (
                <ul className="revision-list">
                  {document.history.map((revision) => (
                    <li key={revision.id}>
                      Rev {revision.revision} · Retired {revision.retiredOn || "—"}
                      {revision.fileName ? <> · <a href={fileHref(document.id, revision.id)}>{revision.fileName}</a></> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="doc-actions">
                {document.current.status === "Draft" ? (
                  <label>
                    Upload file
                    <input
                      type="file"
                      accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                      disabled={pending}
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        event.target.value = "";
                        if (selected) void uploadFile(document.id, selected);
                      }}
                    />
                  </label>
                ) : null}
                {document.current.status === "Draft" ? (
                  <button type="button" disabled={pending} onClick={() => { setApprovingId(document.id); setRevisingId(null); }}>Approve</button>
                ) : (
                  <button type="button" disabled={pending} onClick={() => { setRevisingId(document.id); setApprovingId(null); setNextRevision(""); }}>New revision</button>
                )}
                {document.current.status !== "Retired" ? (
                  <button type="button" disabled={pending} onClick={() => void act(document.id, { action: "retire" })}>Retire</button>
                ) : null}
                <button type="button" disabled={pending} onClick={() => void remove(document.id)}>Delete</button>
              </div>
              {approvingId === document.id ? (
                <div className="doc-actions">
                  <input value={approver} onChange={(event) => setApprover(event.target.value)} placeholder="Approver" />
                  <input type="date" value={effectiveOn} onChange={(event) => setEffectiveOn(event.target.value)} />
                  <button type="button" disabled={pending} onClick={() => void act(document.id, { action: "approve", approver, effectiveOn })}>Confirm approval</button>
                </div>
              ) : null}
              {revisingId === document.id ? (
                <div className="doc-actions">
                  <input value={nextRevision} onChange={(event) => setNextRevision(event.target.value)} placeholder="Next revision" />
                  <button type="button" disabled={pending} onClick={() => void act(document.id, { action: "revise", revision: nextRevision })}>Start revision</button>
                </div>
              ) : null}
              <p className="doc-confidential">{confidentialLines({
                documentNumber: document.documentNumber,
                revision: document.current.revision,
                status: document.current.status,
                effectiveOn: document.current.effectiveOn,
                retiredOn: document.current.retiredOn,
                organizationName,
              }).full}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
