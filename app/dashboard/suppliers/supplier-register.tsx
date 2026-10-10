"use client";

import { useState, type FormEvent } from "react";
import {
  approvalStatuses,
  certificateStatus,
  leadDayOptions,
  type ApprovalStatus,
  type CertificateStatus,
  type LeadDays,
} from "../../../lib/supplier-status";
import type { SupplierFile } from "../../../lib/supplier-files";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function statusClass(status: CertificateStatus) {
  if (status === "Current") return "license-current";
  if (status === "Expired" || status === "Suspended") return "license-due";
  return "license-soon";
}

function rank(status: CertificateStatus) {
  if (status === "Expired") return 0;
  if (status === "Expiring soon") return 1;
  if (status === "Suspended") return 2;
  if (status === "Conditional") return 3;
  return 4;
}

type SupplierForm = {
  supplierName: string;
  suppliedItem: string;
  approval: ApprovalStatus;
  approvedOn: string;
  approvedBy: string;
  certificateName: string;
  certificateNumber: string;
  expiresOn: string;
  leadDays: LeadDays;
};

const emptyForm: SupplierForm = {
  supplierName: "",
  suppliedItem: "",
  approval: "Approved",
  approvedOn: "",
  approvedBy: "",
  certificateName: "",
  certificateNumber: "",
  expiresOn: "",
  leadDays: 60,
};

function formFrom(record: SupplierFile): SupplierForm {
  return {
    supplierName: record.supplierName,
    suppliedItem: record.suppliedItem,
    approval: record.approval,
    approvedOn: record.approvedOn,
    approvedBy: record.approvedBy,
    certificateName: record.certificateName,
    certificateNumber: record.certificateNumber,
    expiresOn: record.expiresOn,
    leadDays: record.leadDays,
  };
}

export function SupplierRegister({
  initialRecords,
  storageError,
}: {
  initialRecords: SupplierFile[];
  storageError?: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [message, setMessage] = useState(storageError ?? "");
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const today = localToday();

  function replace(record: SupplierFile) {
    setRecords((current) => current.map((item) => item.id === record.id ? record : item));
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setMessage(result.error ?? "Could not save the supplier file.");
      return;
    }
    let record = result.record as SupplierFile;
    if (file) {
      const body = new FormData();
      body.set("id", record.id);
      body.set("file", file);
      const upload = await fetch("/api/suppliers/file", { method: "POST", body });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) {
        setRecords((current) => [record, ...current]);
        setPending(false);
        setMessage(uploaded.error ?? "The supplier file was saved, but the certificate could not be uploaded.");
        return;
      }
      record = uploaded.record as SupplierFile;
    }
    setRecords((current) => [record, ...current]);
    setForm(emptyForm);
    setFile(null);
    setFileKey((key) => key + 1);
    setPending(false);
    setMessage(`${record.supplierName} saved with ${record.certificateName}.`);
  }

  async function uploadFile(id: string, selected: File) {
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("id", id);
    body.set("file", selected);
    const response = await fetch("/api/suppliers/file", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not upload the certificate.");
      return;
    }
    replace(result.record);
    setMessage("Certificate saved.");
  }

  async function removeFile(id: string) {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/suppliers/file?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not remove the certificate.");
      return;
    }
    replace(result.record);
    setMessage("Certificate removed.");
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this supplier file and its certificate?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete the supplier file.");
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== id));
    setMessage("Supplier file deleted.");
  }

  const attention = records.filter((record) => {
    const status = certificateStatus(record, today);
    return status === "Expired" || status === "Expiring soon";
  }).length;
  const ordered = [...records].sort((a, b) => {
    const byStatus = rank(certificateStatus(a, today)) - rank(certificateStatus(b, today));
    if (byStatus !== 0) return byStatus;
    return a.expiresOn.localeCompare(b.expiresOn);
  });

  return (
    <>
      <section className="report-section">
        <form onSubmit={createRecord} className="data-form">
          <h2>New supplier file</h2>
          <SupplierFields form={form} onChange={setForm} fileKey={fileKey} onFile={setFile} />
          <button className="button button-dark" type="submit" disabled={pending}>Save supplier file</button>
        </form>
        <p className="fine-print">Supplier risk scores on the overview are entered in Manage data. This register holds the approval and the certificate.</p>
        {message ? <p className="fine-print" role="status">{message}</p> : null}
      </section>

      <section className="report-section">
        <h2>Supplier files ({records.length})</h2>
        {attention > 0 ? (
          <p className="fine-print">{attention} {attention === 1 ? "certificate is" : "certificates are"} expired or inside the alert window.</p>
        ) : null}
        {ordered.length === 0 ? <p className="fine-print">No supplier files yet.</p> : ordered.map((record) => (
          <SupplierCard
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

function SupplierFields({
  form,
  onChange,
  fileKey,
  onFile,
}: {
  form: SupplierForm;
  onChange: (form: SupplierForm) => void;
  fileKey?: number;
  onFile?: (file: File | null) => void;
}) {
  return (
    <div className="data-form-grid">
      <label>
        <span>Supplier</span>
        <input value={form.supplierName} onChange={(event) => onChange({ ...form, supplierName: event.target.value })} placeholder="Northwind Packaging" />
      </label>
      <label>
        <span>Approved to supply</span>
        <input value={form.suppliedItem} onChange={(event) => onChange({ ...form, suppliedItem: event.target.value })} placeholder="Corrugated shippers" />
      </label>
      <label>
        <span>Approval</span>
        <select
          value={form.approval}
          onChange={(event) => onChange({ ...form, approval: event.target.value as ApprovalStatus })}
        >
          {approvalStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <label>
        <span>Approved on</span>
        <input type="date" value={form.approvedOn} onChange={(event) => onChange({ ...form, approvedOn: event.target.value })} />
      </label>
      <label>
        <span>Approved by</span>
        <input value={form.approvedBy} onChange={(event) => onChange({ ...form, approvedBy: event.target.value })} placeholder="Quality manager" />
      </label>
      <label>
        <span>Certificate</span>
        <input value={form.certificateName} onChange={(event) => onChange({ ...form, certificateName: event.target.value })} placeholder="ISO 9001" />
      </label>
      <label>
        <span>Certificate number</span>
        <input value={form.certificateNumber} onChange={(event) => onChange({ ...form, certificateNumber: event.target.value })} placeholder="QMS-10482" />
      </label>
      <label>
        <span>Expires</span>
        <input type="date" value={form.expiresOn} onChange={(event) => onChange({ ...form, expiresOn: event.target.value })} />
      </label>
      <label>
        <span>Alert window</span>
        <select
          value={form.leadDays}
          onChange={(event) => onChange({ ...form, leadDays: Number(event.target.value) as LeadDays })}
        >
          {leadDayOptions.map((days) => <option key={days} value={days}>{days} days</option>)}
        </select>
      </label>
      {onFile ? (
        <label>
          <span>Certificate file</span>
          <input key={fileKey} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
        </label>
      ) : null}
    </div>
  );
}

function SupplierCard({
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
  record: SupplierFile;
  today: string;
  pending: boolean;
  onReplace: (record: SupplierFile) => void;
  onMessage: (message: string) => void;
  onPending: (pending: boolean) => void;
  onUpload: (id: string, file: File) => Promise<void>;
  onRemoveFile: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SupplierForm>(formFrom(record));
  const status = certificateStatus(record, today);

  async function save(event: FormEvent) {
    event.preventDefault();
    onPending(true);
    onMessage("");
    const response = await fetch(`/api/suppliers/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json().catch(() => ({}));
    onPending(false);
    if (!response.ok) {
      onMessage(result.error ?? "Could not update the supplier file.");
      return;
    }
    const next = result.record as SupplierFile;
    setDraft(formFrom(next));
    onReplace(next);
    onMessage(`${next.supplierName} updated.`);
  }

  return (
    <article className="doc-card">
      <b>{record.supplierName} · {record.certificateName}</b>
      <span>{record.suppliedItem} · {record.certificateNumber}</span>
      <span>Approved {record.approvedOn} by {record.approvedBy} · {record.approval}</span>
      <span>Expires {record.expiresOn} · {record.leadDays}-day alert</span>
      <span><i className={statusClass(status)}>{status}</i></span>
      {record.fileName ? (
        <a href={`/api/suppliers/file?id=${encodeURIComponent(record.id)}`}>{record.fileName}</a>
      ) : (
        <span>No certificate file yet.</span>
      )}
      <form className="data-form" onSubmit={save}>
        <h2>Update file</h2>
        <SupplierFields form={draft} onChange={setDraft} />
        <button className="button button-dark" type="submit" disabled={pending}>Save changes</button>
      </form>
      <div className="doc-actions">
        <label>
          {record.fileName ? "Replace certificate" : "Upload certificate"}
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
        {record.fileName ? (
          <button type="button" disabled={pending} onClick={() => void onRemoveFile(record.id)}>Remove certificate</button>
        ) : null}
        <button type="button" disabled={pending} onClick={() => void onDelete(record.id)}>Delete</button>
      </div>
    </article>
  );
}
