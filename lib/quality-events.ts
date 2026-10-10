import { keepAuditedChange, type AuditDraft } from "./audit-trail";
import { complaintSources, deviationSources, intakeKinds, type IntakeKind } from "./event-status";
import { changedFields, eventDeleteBlocked, formatSignature, signatureList, type RecordSignature } from "./part11-records";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";
import { requireSignature } from "./verify-signer";

const bucket = "dgqi-events";
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

export type QualityEvent = {
  id: string;
  kind: IntakeKind;
  number: string;
  openedOn: string;
  reportedBy: string;
  source: string;
  title: string;
  description: string;
  productOrProcess: string;
  capaNumber: string;
  owner: string;
  dueOn: string;
  containment: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  verification: string;
  status: "Open" | "Closed";
  closedOn: string;
  closedOnce?: boolean;
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

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "event-evidence";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "event-evidence";
}

function extensionOf(name: string) {
  return /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

function isKind(value: string): value is IntakeKind {
  return (intakeKinds as readonly string[]).includes(value);
}

function sourceAllowed(kind: IntakeKind, source: string) {
  const sources = kind === "Complaint" ? complaintSources : deviationSources;
  return (sources as readonly string[]).includes(source);
}

function isEvent(value: unknown): value is QualityEvent {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<QualityEvent>;
  return (
    typeof record.id === "string" &&
    typeof record.kind === "string" &&
    isKind(record.kind) &&
    typeof record.number === "string" &&
    typeof record.openedOn === "string" &&
    typeof record.reportedBy === "string" &&
    typeof record.source === "string" &&
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    typeof record.productOrProcess === "string" &&
    typeof record.capaNumber === "string" &&
    typeof record.owner === "string" &&
    typeof record.dueOn === "string" &&
    typeof record.containment === "string" &&
    typeof record.rootCause === "string" &&
    typeof record.correctiveAction === "string" &&
    typeof record.preventiveAction === "string" &&
    typeof record.verification === "string" &&
    (record.status === "Open" || record.status === "Closed") &&
    typeof record.closedOn === "string"
  );
}

function indexPath(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/index.json`;
}

function filePrefix(organizationId: string, recordId: string) {
  return `${encodeURIComponent(organizationId)}/${recordId}/`;
}

function nextNumber(records: QualityEvent[], prefix: "CMP" | "DEV" | "CAPA", year: string) {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const record of records) {
    const values = prefix === "CAPA" ? [record.capaNumber] : [record.number];
    for (const value of values) {
      const match = pattern.exec(value);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

function withoutFile(record: QualityEvent): QualityEvent {
  return {
    id: record.id,
    kind: record.kind,
    number: record.number,
    openedOn: record.openedOn,
    reportedBy: record.reportedBy,
    source: record.source,
    title: record.title,
    description: record.description,
    productOrProcess: record.productOrProcess,
    capaNumber: record.capaNumber,
    owner: record.owner,
    dueOn: record.dueOn,
    containment: record.containment,
    rootCause: record.rootCause,
    correctiveAction: record.correctiveAction,
    preventiveAction: record.preventiveAction,
    verification: record.verification,
    status: record.status,
    closedOn: record.closedOn,
    closedOnce: record.closedOnce,
    signatures: record.signatures,
  };
}

function eventSnapshot(record: QualityEvent) {
  return {
    number: record.number,
    type: record.kind,
    title: record.title,
    "opened on": record.openedOn,
    "reported by": record.reportedBy,
    source: record.source,
    "product or process": record.productOrProcess,
    capa: record.capaNumber,
    owner: record.owner,
    "target date": record.dueOn,
    containment: record.containment,
    "root cause": record.rootCause,
    "corrective action": record.correctiveAction,
    "preventive action": record.preventiveAction,
    verification: record.verification,
    status: record.status,
    "closed on": record.closedOn,
    file: record.fileName ?? "",
    "file path": record.filePath ?? "",
    signatures: signatureList(record.signatures).map(formatSignature).join(" | "),
  };
}

function eventLabel(record: QualityEvent) {
  return `${record.number} / ${record.capaNumber}`;
}

async function persistEvents(
  store: { supabase: Store; scope: { organizationId: string } },
  previous: QualityEvent[],
  next: QualityEvent[],
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
  if (error || !data) return [] as QualityEvent[];
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(isEvent) : [];
  } catch {
    return [];
  }
}

async function writeIndex(supabase: Store, organizationId: string, records: QualityEvent[]) {
  const body = JSON.stringify(records);
  if (Buffer.byteLength(body) > maxIndexBytes) {
    return { ok: false as const, error: "The complaint register is too large.", status: 413 as const };
  }
  const { error } = await supabase.storage.from(bucket).upload(indexPath(organizationId), Buffer.from(body), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 500 as const };
  return { ok: true as const };
}

export async function listQualityEvents() {
  const store = await openStore();
  if ("ok" in store) return store;
  return { ok: true as const, status: 200 as const, records: await readIndex(store.supabase, store.scope.organizationId) };
}

export async function createQualityEvent(input: unknown) {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const kind = text(fields.kind, 20);
  const openedOn = text(fields.openedOn, 10);
  const reportedBy = text(fields.reportedBy, 80);
  const source = text(fields.source, 40);
  const title = text(fields.title, 120);
  const description = text(fields.description, 4000);
  const productOrProcess = text(fields.productOrProcess, 120);
  const owner = text(fields.owner, 80);
  const dueOn = text(fields.dueOn, 10);
  if (!isKind(kind) || !reportedBy || !title || !description || !owner) {
    return {
      ok: false as const,
      error: "Type, date, reported by, source, title, description, owner, and target date are required.",
      status: 400 as const,
    };
  }
  if (!isDate(openedOn) || !isDate(dueOn)) {
    return { ok: false as const, error: "Enter the date opened and the target closure date.", status: 400 as const };
  }
  if (dueOn < openedOn) {
    return { ok: false as const, error: "The target closure date is before the date opened.", status: 400 as const };
  }
  if (!sourceAllowed(kind, source)) {
    return { ok: false as const, error: "Choose a source for this complaint or deviation.", status: 400 as const };
  }
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const year = openedOn.slice(0, 4);
  const record: QualityEvent = {
    id: crypto.randomUUID(),
    kind,
    number: nextNumber(records, kind === "Complaint" ? "CMP" : "DEV", year),
    openedOn,
    reportedBy,
    source,
    title,
    description,
    productOrProcess,
    capaNumber: nextNumber(records, "CAPA", year),
    owner,
    dueOn,
    containment: "",
    rootCause: "",
    correctiveAction: "",
    preventiveAction: "",
    verification: "",
    status: "Open",
    closedOn: "",
  };
  const saved = await persistEvents(store, records, [record, ...records], {
    action: "create",
    recordType: "complaint",
    recordId: record.id,
    recordLabel: eventLabel(record),
    meaning: "",
    changes: changedFields({}, eventSnapshot(record)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 201 as const, record };
}

export async function updateQualityEvent(id: string, input: unknown) {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const action = text(fields.action, 20);
  if (action !== "save" && action !== "close" && action !== "reopen") {
    return { ok: false as const, error: "Choose save, close, or reopen.", status: 400 as const };
  }
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Complaint or deviation not found.", status: 404 as const };
  if (action === "reopen") {
    if (record.status === "Open") {
      return { ok: false as const, error: "This CAPA is already open.", status: 409 as const };
    }
    const reopened: QualityEvent = { ...record, status: "Open", closedOn: "", closedOnce: true };
    const saved = await persistEvents(store, records, records.map((item) => item.id === id ? reopened : item), {
      action: "update",
      recordType: "complaint",
      recordId: record.id,
      recordLabel: eventLabel(record),
      meaning: "",
      changes: changedFields(eventSnapshot(record), eventSnapshot(reopened)),
    });
    if (!saved.ok) return saved;
    return { ok: true as const, status: 200 as const, record: reopened };
  }
  if (record.status === "Closed") {
    return { ok: false as const, error: "Reopen the CAPA before changing it.", status: 409 as const };
  }
  const title = text(fields.title, 120);
  const description = text(fields.description, 4000);
  const productOrProcess = text(fields.productOrProcess, 120);
  const owner = text(fields.owner, 80);
  const dueOn = text(fields.dueOn, 10);
  const containment = text(fields.containment, 4000);
  const rootCause = text(fields.rootCause, 4000);
  const correctiveAction = text(fields.correctiveAction, 4000);
  const preventiveAction = text(fields.preventiveAction, 4000);
  const verification = text(fields.verification, 4000);
  if (!title || !description || !owner || !isDate(dueOn)) {
    return { ok: false as const, error: "Title, description, owner, and target date are required.", status: 400 as const };
  }
  if (dueOn < record.openedOn) {
    return { ok: false as const, error: "The target closure date is before the date opened.", status: 400 as const };
  }
  if (action === "close" && (!rootCause || !correctiveAction || !verification)) {
    return {
      ok: false as const,
      error: "Add the root cause, corrective action, and verification before closing the CAPA.",
      status: 400 as const,
    };
  }
  let signature = null;
  if (action === "close") {
    const signed = await requireSignature(fields.password, "closure");
    if (!signed.ok) return signed;
    signature = signed.signature;
  }
  const next: QualityEvent = {
    ...record,
    title,
    description,
    productOrProcess,
    owner,
    dueOn,
    containment,
    rootCause,
    correctiveAction,
    preventiveAction,
    verification,
    status: action === "close" ? "Closed" : "Open",
    closedOn: signature ? signature.signedAt.slice(0, 10) : "",
    closedOnce: signature ? true : record.closedOnce,
    signatures: signature ? [...signatureList(record.signatures), signature] : record.signatures,
  };
  const saved = await persistEvents(store, records, records.map((item) => item.id === id ? next : item), {
    action: signature ? "sign" : "update",
    recordType: "complaint",
    recordId: record.id,
    recordLabel: eventLabel(record),
    meaning: signature ? "closure" : "",
    changes: changedFields(eventSnapshot(record), eventSnapshot(next)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, record: next };
}

export async function deleteQualityEvent(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Complaint or deviation not found.", status: 404 as const };
  if (eventDeleteBlocked(record)) {
    return { ok: false as const, error: "A closed CAPA stays on the register, including after it is reopened.", status: 409 as const };
  }
  const saved = await persistEvents(store, records, records.filter((item) => item.id !== id), {
    action: "delete",
    recordType: "complaint",
    recordId: record.id,
    recordLabel: eventLabel(record),
    meaning: "",
    changes: changedFields(eventSnapshot(record), {}),
  });
  if (!saved.ok) return saved;
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  return { ok: true as const, status: 200 as const };
}

export async function saveEventFile(id: string, file: File) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Complaint or deviation not found.", status: 404 as const };
  if (record.status === "Closed") {
    return { ok: false as const, error: "Reopen the CAPA before changing its evidence.", status: 409 as const };
  }
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
  const saved = await persistEvents(store, records, next, {
    action: "update",
    recordType: "complaint",
    recordId: record.id,
    recordLabel: eventLabel(record),
    meaning: "",
    changes: changedFields(eventSnapshot(record), eventSnapshot(updated)),
  });
  if (!saved.ok) {
    await store.supabase.storage.from(bucket).remove([filePath]);
    return saved;
  }
  return { ok: true as const, status: 200 as const, record: updated };
}

export async function removeEventFile(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Complaint or deviation not found.", status: 404 as const };
  if (record.status === "Closed") {
    return { ok: false as const, error: "Reopen the CAPA before changing its evidence.", status: 409 as const };
  }
  const next = records.map((item) => item.id === id ? withoutFile(item) : item);
  const updated = next.find((item) => item.id === id) ?? record;
  const saved = await persistEvents(store, records, next, {
    action: "update",
    recordType: "complaint",
    recordId: record.id,
    recordLabel: eventLabel(record),
    meaning: "",
    changes: changedFields(eventSnapshot(record), eventSnapshot(updated)),
  });
  if (!saved.ok) return saved;
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  return { ok: true as const, status: 200 as const, record: updated };
}

export async function readEventFile(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record?.filePath || !record.fileName) {
    return { ok: false as const, error: "No evidence file is stored for this record.", status: 404 as const };
  }
  const prefix = filePrefix(store.scope.organizationId, record.id);
  if (!record.filePath.startsWith(prefix)) {
    return { ok: false as const, error: "No evidence file is stored for this record.", status: 404 as const };
  }
  const { data, error } = await store.supabase.storage.from(bucket).download(record.filePath);
  if (error || !data) return { ok: false as const, error: "No evidence file is stored for this record.", status: 404 as const };
  return {
    ok: true as const,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName: record.fileName,
    fileType: record.fileType || "application/octet-stream",
  };
}
