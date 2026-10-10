import { keepAuditedChange, type AuditDraft } from "./audit-trail";
import { changedFields, formatSignature, signatureList, supplierIsRetained, type RecordSignature } from "./part11-records";
import { isApproval, isLeadDays, type ApprovalStatus, type LeadDays } from "./supplier-status";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";
import { requireSignature } from "./verify-signer";

const bucket = "dgqi-suppliers";
const maxBytes = 10 * 1024 * 1024;
const maxIndexBytes = 2_000_000;

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type SupplierFile = {
  id: string;
  supplierName: string;
  suppliedItem: string;
  approval: ApprovalStatus;
  approvedOn: string;
  approvedBy: string;
  certificateName: string;
  certificateNumber: string;
  expiresOn: string;
  leadDays: LeadDays;
  retained?: boolean;
  signatures?: RecordSignature[];
  fileName?: string;
  filePath?: string;
  fileType?: string;
};

type Failure = { ok: false; error: string; status: number };
type Store = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function leadDaysOf(value: unknown): LeadDays | null {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  return isLeadDays(number) ? number : null;
}

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "supplier-certificate";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "supplier-certificate";
}

function extensionOf(name: string) {
  return /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

function isFile(value: unknown): value is SupplierFile {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SupplierFile>;
  return (
    typeof record.id === "string" &&
    typeof record.supplierName === "string" &&
    typeof record.suppliedItem === "string" &&
    typeof record.approval === "string" &&
    isApproval(record.approval) &&
    typeof record.approvedOn === "string" &&
    typeof record.approvedBy === "string" &&
    typeof record.certificateName === "string" &&
    typeof record.certificateNumber === "string" &&
    typeof record.expiresOn === "string" &&
    typeof record.leadDays === "number" &&
    isLeadDays(record.leadDays)
  );
}

function indexPath(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/index.json`;
}

function filePrefix(organizationId: string, recordId: string) {
  return `${encodeURIComponent(organizationId)}/${recordId}/`;
}

function withoutFile(record: SupplierFile): SupplierFile {
  return {
    id: record.id,
    supplierName: record.supplierName,
    suppliedItem: record.suppliedItem,
    approval: record.approval,
    approvedOn: record.approvedOn,
    approvedBy: record.approvedBy,
    certificateName: record.certificateName,
    certificateNumber: record.certificateNumber,
    expiresOn: record.expiresOn,
    leadDays: record.leadDays,
    retained: record.retained,
    signatures: record.signatures,
  };
}

function sameCertificate(left: SupplierFile, right: { supplierName: string; certificateNumber: string }) {
  return left.supplierName.toLowerCase() === right.supplierName.toLowerCase()
    && left.certificateNumber.toLowerCase() === right.certificateNumber.toLowerCase();
}

type SupplierInput = {
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

function readInput(input: unknown): SupplierInput | Failure {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const supplierName = text(fields.supplierName, 120);
  const suppliedItem = text(fields.suppliedItem, 160);
  const approval = text(fields.approval, 20);
  const approvedOn = text(fields.approvedOn, 10);
  const approvedBy = text(fields.approvedBy, 80);
  const certificateName = text(fields.certificateName, 120);
  const certificateNumber = text(fields.certificateNumber, 80);
  const expiresOn = text(fields.expiresOn, 10);
  const leadDays = leadDaysOf(fields.leadDays);
  if (!supplierName || !suppliedItem || !certificateName || !certificateNumber || !isApproval(approval)) {
    return {
      ok: false,
      error: "Supplier, what they supply, approval, certificate name, and certificate number are required.",
      status: 400,
    };
  }
  if (approval !== "Approved" && !approvedBy) {
    return { ok: false, error: "Enter who recorded this approval.", status: 400 };
  }
  if (!isDate(approvedOn) || !isDate(expiresOn)) {
    return { ok: false, error: "Enter the approval date and the certificate expiration.", status: 400 };
  }
  if (!leadDays) {
    return { ok: false, error: "Choose a 30, 60, or 90 day alert.", status: 400 };
  }
  return {
    supplierName,
    suppliedItem,
    approval,
    approvedOn,
    approvedBy,
    certificateName,
    certificateNumber,
    expiresOn,
    leadDays,
  };
}

async function openStore(): Promise<{ scope: { organizationId: string; userId: string }; supabase: Store } | Failure> {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return { ok: false, error: "Authentication required.", status: 401 };
  if (!supabase) return { ok: false, error: "Supabase is not configured.", status: 503 };
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) {
    const created = await supabase.storage.createBucket(bucket, { public: false });
    if (created.error && !/already exists/i.test(created.error.message)) {
      return { ok: false, error: created.error.message, status: 500 };
    }
  }
  return { scope, supabase };
}

async function readIndex(supabase: Store, organizationId: string) {
  const { data, error } = await supabase.storage.from(bucket).download(indexPath(organizationId));
  if (error || !data) return [] as SupplierFile[];
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(isFile) : [];
  } catch {
    return [];
  }
}

async function writeIndex(supabase: Store, organizationId: string, records: SupplierFile[]) {
  const body = JSON.stringify(records);
  if (Buffer.byteLength(body) > maxIndexBytes) {
    return { ok: false as const, error: "The supplier register is too large.", status: 413 as const };
  }
  const { error } = await supabase.storage.from(bucket).upload(indexPath(organizationId), Buffer.from(body), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 500 as const };
  return { ok: true as const };
}

function supplierSnapshot(record: SupplierFile) {
  return {
    supplier: record.supplierName,
    "supplied item": record.suppliedItem,
    approval: record.approval,
    "approved on": record.approvedOn,
    "approved by": record.approvedBy,
    certificate: record.certificateName,
    "certificate number": record.certificateNumber,
    expires: record.expiresOn,
    "alert days": String(record.leadDays),
    file: record.fileName ?? "",
    "file path": record.filePath ?? "",
    signatures: signatureList(record.signatures).map(formatSignature).join(" | "),
  };
}

function supplierLabel(record: SupplierFile) {
  return `${record.supplierName} · ${record.certificateNumber}`;
}

async function persistSuppliers(
  store: { supabase: Store; scope: { organizationId: string } },
  previous: SupplierFile[],
  next: SupplierFile[],
  draft: AuditDraft,
) {
  return keepAuditedChange(
    store.supabase,
    store.scope.organizationId,
    draft,
    () => writeIndex(store.supabase, store.scope.organizationId, next),
    () => writeIndex(store.supabase, store.scope.organizationId, previous),
  );
}

function passwordOf(input: unknown) {
  if (!input || typeof input !== "object") return "";
  const value = (input as { password?: unknown }).password;
  return typeof value === "string" ? value : "";
}

async function withApprovalSignature(input: unknown, fields: SupplierInput, existing?: SupplierFile) {
  const retained = Boolean(existing && supplierIsRetained(existing)) || fields.approval === "Approved";
  const needsSignature = fields.approval === "Approved" && (!existing || existing.approval !== "Approved" || signatureList(existing.signatures).length === 0);
  if (!needsSignature) {
    const approvedBy = fields.approval === "Approved" && existing ? existing.approvedBy : fields.approvedBy;
    return {
      ok: true as const,
      signed: false,
      recordFields: { ...fields, approvedBy, retained, signatures: existing?.signatures },
    };
  }
  const signed = await requireSignature(passwordOf(input), "approval");
  if (!signed.ok) return signed;
  return {
    ok: true as const,
    recordFields: {
      ...fields,
      approvedBy: signed.signature.printedName,
      approvedOn: fields.approvedOn || signed.signature.signedAt.slice(0, 10),
      retained: true,
      signatures: [...signatureList(existing?.signatures), signed.signature],
    },
    signed: true,
  };
}

export async function listSupplierFiles() {
  const store = await openStore();
  if ("ok" in store) return store;
  return { ok: true as const, status: 200 as const, records: await readIndex(store.supabase, store.scope.organizationId) };
}

export async function createSupplierFile(input: unknown) {
  const fields = readInput(input);
  if ("ok" in fields) return fields;
  const signed = await withApprovalSignature(input, fields);
  if (!signed.ok) return signed;
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  if (records.some((record) => sameCertificate(record, fields))) {
    return { ok: false as const, error: "That certificate is already on file for this supplier.", status: 409 as const };
  }
  const record: SupplierFile = { id: crypto.randomUUID(), ...signed.recordFields };
  const saved = await persistSuppliers(store, records, [record, ...records], {
    action: signed.signed ? "sign" : "create",
    recordType: "supplier",
    recordId: record.id,
    recordLabel: supplierLabel(record),
    meaning: signed.signed ? "approval" : "",
    changes: changedFields({}, supplierSnapshot(record)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 201 as const, record };
}

export async function updateSupplierFile(id: string, input: unknown) {
  const fields = readInput(input);
  if ("ok" in fields) return fields;
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Supplier file not found.", status: 404 as const };
  if (records.some((item) => item.id !== id && sameCertificate(item, fields))) {
    return { ok: false as const, error: "That certificate is already on file for this supplier.", status: 409 as const };
  }
  const signed = await withApprovalSignature(input, fields, record);
  if (!signed.ok) return signed;
  const next: SupplierFile = {
    ...record,
    ...signed.recordFields,
    fileName: record.fileName,
    filePath: record.filePath,
    fileType: record.fileType,
  };
  const saved = await persistSuppliers(store, records, records.map((item) => item.id === id ? next : item), {
    action: signed.signed ? "sign" : "update",
    recordType: "supplier",
    recordId: record.id,
    recordLabel: supplierLabel(next),
    meaning: signed.signed ? "approval" : "",
    changes: changedFields(supplierSnapshot(record), supplierSnapshot(next)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, record: next };
}

export async function deleteSupplierFile(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Supplier file not found.", status: 404 as const };
  if (supplierIsRetained(record)) {
    return { ok: false as const, error: "An approved supplier file stays on the register.", status: 409 as const };
  }
  const saved = await persistSuppliers(store, records, records.filter((item) => item.id !== id), {
    action: "delete",
    recordType: "supplier",
    recordId: record.id,
    recordLabel: supplierLabel(record),
    meaning: "",
    changes: changedFields(supplierSnapshot(record), {}),
  });
  if (!saved.ok) return saved;
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  return { ok: true as const, status: 200 as const };
}

export async function saveSupplierCertificate(id: string, file: File) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Supplier file not found.", status: 404 as const };
  const fileName = safeFileName(file.name);
  const mime = mimeByExtension[extensionOf(fileName)];
  const jpegAlias = mime === "image/jpeg" && file.type === "image/jpg";
  const wordAlias = extensionOf(fileName) === "docx" && file.type === "application/octet-stream";
  if (!mime || (file.type && file.type !== mime && !jpegAlias && !wordAlias)) {
    return { ok: false as const, error: "Upload a PDF, Word, PNG, JPG, or WebP file.", status: 400 as const };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.byteLength) return { ok: false as const, error: "The file is empty.", status: 400 as const };
  if (bytes.byteLength > maxBytes) return { ok: false as const, error: "Files must be 10 MB or smaller.", status: 413 as const };
  const filePath = `${filePrefix(store.scope.organizationId, record.id)}${fileName}`;
  const { error: uploadError } = await store.supabase.storage.from(bucket).upload(filePath, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (uploadError) return { ok: false as const, error: uploadError.message, status: 500 as const };
  const next = records.map((item) => item.id === id ? { ...item, fileName, filePath, fileType: mime } : item);
  const updated = next.find((item) => item.id === id) ?? record;
  const saved = await persistSuppliers(store, records, next, {
    action: "update",
    recordType: "supplier",
    recordId: record.id,
    recordLabel: supplierLabel(record),
    meaning: "",
    changes: changedFields(supplierSnapshot(record), supplierSnapshot(updated)),
  });
  if (!saved.ok) {
    await store.supabase.storage.from(bucket).remove([filePath]);
    return saved;
  }
  return { ok: true as const, status: 200 as const, record: updated };
}

export async function removeSupplierCertificate(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Supplier file not found.", status: 404 as const };
  if (supplierIsRetained(record)) {
    return { ok: false as const, error: "The certificate on an approved supplier file stays stored. Upload a replacement to add a newer file.", status: 409 as const };
  }
  const next = records.map((item) => item.id === id ? withoutFile(item) : item);
  const updated = next.find((item) => item.id === id) ?? record;
  const saved = await persistSuppliers(store, records, next, {
    action: "update",
    recordType: "supplier",
    recordId: record.id,
    recordLabel: supplierLabel(record),
    meaning: "",
    changes: changedFields(supplierSnapshot(record), supplierSnapshot(updated)),
  });
  if (!saved.ok) return saved;
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  return { ok: true as const, status: 200 as const, record: updated };
}

export async function readSupplierCertificate(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record?.filePath || !record.fileName) {
    return { ok: false as const, error: "No certificate file is stored for this supplier.", status: 404 as const };
  }
  const prefix = filePrefix(store.scope.organizationId, record.id);
  if (!record.filePath.startsWith(prefix)) {
    return { ok: false as const, error: "No certificate file is stored for this supplier.", status: 404 as const };
  }
  const { data, error } = await store.supabase.storage.from(bucket).download(record.filePath);
  if (error || !data) return { ok: false as const, error: "No certificate file is stored for this supplier.", status: 404 as const };
  return {
    ok: true as const,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName: record.fileName,
    fileType: record.fileType || "application/octet-stream",
  };
}
