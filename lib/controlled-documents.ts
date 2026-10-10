import { keepAuditedChange, type AuditDraft } from "./audit-trail";
import { changedFields, documentIsRetained, formatSignature, type RecordSignature } from "./part11-records";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";
import { requireSignature } from "./verify-signer";

const bucket = "dgqi-documents";
const maxBytes = 15 * 1024 * 1024;
const maxIndexBytes = 2_000_000;

const documentTypes = ["SOP", "Work instruction", "Policy", "Form"] as const;
const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type DocumentType = (typeof documentTypes)[number];
export type RevisionStatus = "Draft" | "Approved" | "Retired";

export type DocumentRevision = {
  id: string;
  revision: string;
  status: RevisionStatus;
  approver: string;
  approvedOn: string;
  effectiveOn: string;
  retiredOn: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  signature?: RecordSignature;
};

export type ControlledDocument = {
  id: string;
  documentNumber: string;
  title: string;
  documentType: DocumentType;
  owner: string;
  current: DocumentRevision;
  history: DocumentRevision[];
};

type Failure = { ok: false; error: string; status: number };
type Store = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isDate(value: string) {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "document";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "document";
}

function extensionOf(name: string) {
  return /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

function isDocumentType(value: string): value is DocumentType {
  return (documentTypes as readonly string[]).includes(value);
}

function isRevision(value: unknown): value is DocumentRevision {
  if (!value || typeof value !== "object") return false;
  const revision = value as Partial<DocumentRevision>;
  return (
    typeof revision.id === "string" &&
    typeof revision.revision === "string" &&
    (revision.status === "Draft" || revision.status === "Approved" || revision.status === "Retired") &&
    typeof revision.approver === "string" &&
    typeof revision.approvedOn === "string" &&
    typeof revision.effectiveOn === "string" &&
    typeof revision.retiredOn === "string"
  );
}

function isDocument(value: unknown): value is ControlledDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<ControlledDocument>;
  return (
    typeof document.id === "string" &&
    typeof document.documentNumber === "string" &&
    typeof document.title === "string" &&
    typeof document.owner === "string" &&
    isDocumentType(document.documentType ?? "") &&
    isRevision(document.current) &&
    Array.isArray(document.history) &&
    document.history.every(isRevision)
  );
}

function indexPath(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/index.json`;
}

function filePrefix(organizationId: string, documentId: string, revisionId: string) {
  return `${encodeURIComponent(organizationId)}/${documentId}/${revisionId}/`;
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
  if (error || !data) return [] as ControlledDocument[];
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(isDocument) : [];
  } catch {
    return [];
  }
}

async function writeIndex(supabase: Store, organizationId: string, documents: ControlledDocument[]) {
  const body = JSON.stringify(documents);
  if (Buffer.byteLength(body) > maxIndexBytes) {
    return { ok: false as const, error: "The document register is too large.", status: 413 as const };
  }
  const { error } = await supabase.storage.from(bucket).upload(indexPath(organizationId), Buffer.from(body), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 500 as const };
  return { ok: true as const };
}

function documentSnapshot(document: ControlledDocument) {
  return {
    "document number": document.documentNumber,
    title: document.title,
    type: document.documentType,
    owner: document.owner,
    revision: document.current.revision,
    status: document.current.status,
    approver: document.current.approver,
    "approved on": document.current.approvedOn,
    "effective on": document.current.effectiveOn,
    "retired on": document.current.retiredOn,
    file: document.current.fileName ?? "",
    "file path": document.current.filePath ?? "",
    signature: document.current.signature ? formatSignature(document.current.signature) : "",
    history: document.history.map((revision) => `Rev ${revision.revision} ${revision.status}`).join("; "),
  };
}

function documentLabel(document: ControlledDocument) {
  return `${document.documentNumber} Rev ${document.current.revision}`;
}

async function persistDocuments(
  store: { supabase: Store; scope: { organizationId: string } },
  previous: ControlledDocument[],
  next: ControlledDocument[],
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

export async function listControlledDocuments() {
  const store = await openStore();
  if ("ok" in store) return store;
  return { ok: true as const, status: 200 as const, documents: await readIndex(store.supabase, store.scope.organizationId) };
}

export async function createControlledDocument(input: unknown) {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const store = await openStore();
  if ("ok" in store) return store;
  const documentNumber = text(fields.documentNumber, 40);
  const title = text(fields.title, 160);
  const documentType = text(fields.documentType, 40);
  const owner = text(fields.owner, 80);
  const revision = text(fields.revision, 20) || "1";
  if (!documentNumber || !title || !owner) {
    return { ok: false as const, error: "Document number, title, and owner are required.", status: 400 as const };
  }
  if (!isDocumentType(documentType)) {
    return { ok: false as const, error: "Choose SOP, work instruction, policy, or form.", status: 400 as const };
  }
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  if (documents.some((item) => item.documentNumber.toLowerCase() === documentNumber.toLowerCase())) {
    return { ok: false as const, error: "That document number is already in use.", status: 409 as const };
  }
  const document: ControlledDocument = {
    id: crypto.randomUUID(),
    documentNumber,
    title,
    documentType,
    owner,
    current: {
      id: crypto.randomUUID(),
      revision,
      status: "Draft",
      approver: "",
      approvedOn: "",
      effectiveOn: "",
      retiredOn: "",
    },
    history: [],
  };
  const saved = await persistDocuments(store, documents, [document, ...documents], {
    action: "create",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "",
    changes: changedFields({}, documentSnapshot(document)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 201 as const, document };
}

function findDocument(documents: ControlledDocument[], id: string) {
  return documents.find((item) => item.id === id);
}

export async function approveDocument(id: string, input: { effectiveOn?: unknown; password?: unknown }) {
  const store = await openStore();
  if ("ok" in store) return store;
  const effectiveOn = text(input.effectiveOn, 10);
  if (!isDate(effectiveOn) || !effectiveOn) {
    return { ok: false as const, error: "An effective date is required.", status: 400 as const };
  }
  const signed = await requireSignature(input.password, "approval");
  if (!signed.ok) return signed;
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  if (!document) return { ok: false as const, error: "Document not found.", status: 404 as const };
  if (document.current.status !== "Draft") {
    return { ok: false as const, error: "Only a draft revision can be approved.", status: 409 as const };
  }
  if (!document.current.filePath) {
    return { ok: false as const, error: "Upload the file before approving this revision.", status: 400 as const };
  }
  const previous = structuredClone(documents);
  const before = documentSnapshot(document);
  document.current = {
    ...document.current,
    status: "Approved",
    approver: signed.signature.printedName,
    approvedOn: signed.signature.signedAt.slice(0, 10),
    effectiveOn,
    retiredOn: "",
    signature: signed.signature,
  };
  const saved = await persistDocuments(store, previous, documents, {
    action: "sign",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "approval",
    changes: changedFields(before, documentSnapshot(document)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, document };
}

export async function startNextRevision(id: string, input: { revision?: unknown }) {
  const store = await openStore();
  if ("ok" in store) return store;
  const revision = text(input.revision, 20);
  if (!revision) return { ok: false as const, error: "Enter the new revision.", status: 400 as const };
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  if (!document) return { ok: false as const, error: "Document not found.", status: 404 as const };
  if (document.current.status === "Draft") {
    return { ok: false as const, error: "Approve or delete the draft before starting another revision.", status: 409 as const };
  }
  if (revision.toLowerCase() === document.current.revision.toLowerCase()) {
    return { ok: false as const, error: "The new revision needs a different number.", status: 400 as const };
  }
  const previous = structuredClone(documents);
  const before = documentSnapshot(document);
  const retired = { ...document.current, status: "Retired" as const, retiredOn: today() };
  document.history = [retired, ...document.history];
  document.current = {
    id: crypto.randomUUID(),
    revision,
    status: "Draft",
    approver: "",
    approvedOn: "",
    effectiveOn: "",
    retiredOn: "",
  };
  const saved = await persistDocuments(store, previous, documents, {
    action: "update",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "",
    changes: changedFields(before, documentSnapshot(document)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, document };
}

export async function retireDocument(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  if (!document) return { ok: false as const, error: "Document not found.", status: 404 as const };
  if (document.current.status === "Retired") {
    return { ok: false as const, error: "This revision is already retired.", status: 409 as const };
  }
  const previous = structuredClone(documents);
  const before = documentSnapshot(document);
  document.current = { ...document.current, status: "Retired", retiredOn: today() };
  const saved = await persistDocuments(store, previous, documents, {
    action: "update",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "",
    changes: changedFields(before, documentSnapshot(document)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, document };
}

export async function deleteControlledDocument(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  if (!document) return { ok: false as const, error: "Document not found.", status: 404 as const };
  if (documentIsRetained([document.current, ...document.history].map((revision) => revision.status))) {
    return { ok: false as const, error: "Approved and retired revisions stay on the register.", status: 409 as const };
  }
  const paths = [document.current, ...document.history].flatMap((revision) => revision.filePath ? [revision.filePath] : []);
  const saved = await persistDocuments(store, documents, documents.filter((item) => item.id !== id), {
    action: "delete",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "",
    changes: changedFields(documentSnapshot(document), {}),
  });
  if (!saved.ok) return saved;
  if (paths.length) await store.supabase.storage.from(bucket).remove(paths);
  return { ok: true as const, status: 200 as const };
}

function revisionOf(document: ControlledDocument, revisionId: string) {
  if (document.current.id === revisionId) return document.current;
  return document.history.find((revision) => revision.id === revisionId);
}

export async function saveDocumentFile(id: string, file: File) {
  const store = await openStore();
  if ("ok" in store) return store;
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  if (!document) return { ok: false as const, error: "Document not found.", status: 404 as const };
  if (document.current.status !== "Draft") {
    return { ok: false as const, error: "Start a new revision before replacing an approved file.", status: 409 as const };
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
  if (bytes.byteLength > maxBytes) return { ok: false as const, error: "Files must be 15 MB or smaller.", status: 413 as const };
  const filePath = `${filePrefix(store.scope.organizationId, document.id, document.current.id)}${fileName}`;
  const { error: uploadError } = await store.supabase.storage.from(bucket).upload(filePath, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (uploadError) return { ok: false as const, error: uploadError.message, status: 500 as const };
  const previous = structuredClone(documents);
  const before = documentSnapshot(document);
  const previousPath = document.current.filePath ?? "";
  document.current = { ...document.current, fileName, filePath, fileType: mime };
  const saved = await persistDocuments(store, previous, documents, {
    action: "update",
    recordType: "document",
    recordId: document.id,
    recordLabel: documentLabel(document),
    meaning: "",
    changes: changedFields(before, documentSnapshot(document)),
  });
  if (!saved.ok) {
    await store.supabase.storage.from(bucket).remove([filePath]);
    return saved;
  }
  if (previousPath && previousPath !== filePath) await store.supabase.storage.from(bucket).remove([previousPath]);
  return { ok: true as const, status: 200 as const, document };
}

export async function readDocumentFile(id: string, revisionId: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const documents = await readIndex(store.supabase, store.scope.organizationId);
  const document = findDocument(documents, id);
  const revision = document ? revisionOf(document, revisionId || document.current.id) : undefined;
  if (!document || !revision?.filePath || !revision.fileName) {
    return { ok: false as const, error: "No file is stored for this revision.", status: 404 as const };
  }
  const prefix = filePrefix(store.scope.organizationId, document.id, revision.id);
  if (!revision.filePath.startsWith(prefix)) {
    return { ok: false as const, error: "No file is stored for this revision.", status: 404 as const };
  }
  const { data, error } = await store.supabase.storage.from(bucket).download(revision.filePath);
  if (error || !data) return { ok: false as const, error: "No file is stored for this revision.", status: 404 as const };
  return {
    ok: true as const,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName: revision.fileName,
    fileType: revision.fileType || "application/octet-stream",
    documentNumber: document.documentNumber,
    revision: revision.revision,
    revisionStatus: revision.status,
    effectiveOn: revision.effectiveOn,
    retiredOn: revision.retiredOn,
  };
}
