import { listControlledDocuments, type ControlledDocument } from "./controlled-documents";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";

const bucket = "dgqi-training";
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

export type TrainingRecord = {
  id: string;
  personName: string;
  role: string;
  trainer: string;
  trainedOn: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  revisionId: string;
  revision: string;
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
  const base = name.split(/[/\\]/).pop() ?? "training-record";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "training-record";
}

function extensionOf(name: string) {
  return /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

function isRecord(value: unknown): value is TrainingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TrainingRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.personName === "string" &&
    typeof record.role === "string" &&
    typeof record.trainer === "string" &&
    typeof record.trainedOn === "string" &&
    typeof record.documentId === "string" &&
    typeof record.documentNumber === "string" &&
    typeof record.documentTitle === "string" &&
    typeof record.revisionId === "string" &&
    typeof record.revision === "string"
  );
}

function indexPath(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/index.json`;
}

function filePrefix(organizationId: string, recordId: string) {
  return `${encodeURIComponent(organizationId)}/${recordId}/`;
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
  if (error || !data) return [] as TrainingRecord[];
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

async function writeIndex(supabase: Store, organizationId: string, records: TrainingRecord[]) {
  const body = JSON.stringify(records);
  if (Buffer.byteLength(body) > maxIndexBytes) {
    return { ok: false as const, error: "The training register is too large.", status: 413 as const };
  }
  const { error } = await supabase.storage.from(bucket).upload(indexPath(organizationId), Buffer.from(body), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 500 as const };
  return { ok: true as const };
}

function findRevision(document: ControlledDocument, revisionId: string) {
  if (document.current.id === revisionId) return document.current;
  return document.history.find((revision) => revision.id === revisionId);
}

export async function listTrainingRecords() {
  const store = await openStore();
  if ("ok" in store) return store;
  return { ok: true as const, status: 200 as const, records: await readIndex(store.supabase, store.scope.organizationId) };
}

export async function createTrainingRecord(input: unknown) {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const personName = text(fields.personName, 80);
  const role = text(fields.role, 80);
  const trainer = text(fields.trainer, 80);
  const trainedOn = text(fields.trainedOn, 10);
  const documentId = text(fields.documentId, 80);
  const revisionId = text(fields.revisionId, 80);
  if (!personName || !role || !trainer || !documentId || !revisionId) {
    return { ok: false as const, error: "Name, role, trainer, document, and revision are required.", status: 400 as const };
  }
  if (!isDate(trainedOn)) {
    return { ok: false as const, error: "Enter the date of training.", status: 400 as const };
  }
  const store = await openStore();
  if ("ok" in store) return store;
  const documents = await listControlledDocuments();
  if (!documents.ok) return documents;
  const document = documents.documents.find((item) => item.id === documentId);
  const revision = document ? findRevision(document, revisionId) : undefined;
  if (!document || !revision) {
    return { ok: false as const, error: "Choose a document revision from the register.", status: 400 as const };
  }
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const duplicate = records.some((record) => (
    record.personName.toLowerCase() === personName.toLowerCase() && record.revisionId === revision.id
  ));
  if (duplicate) {
    return { ok: false as const, error: "That person is already recorded on this revision.", status: 409 as const };
  }
  const record: TrainingRecord = {
    id: crypto.randomUUID(),
    personName,
    role,
    trainer,
    trainedOn,
    documentId: document.id,
    documentNumber: document.documentNumber,
    documentTitle: document.title,
    revisionId: revision.id,
    revision: revision.revision,
  };
  const saved = await writeIndex(store.supabase, store.scope.organizationId, [record, ...records]);
  if (!saved.ok) return saved;
  return { ok: true as const, status: 201 as const, record };
}

export async function deleteTrainingRecord(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Training record not found.", status: 404 as const };
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  const saved = await writeIndex(
    store.supabase,
    store.scope.organizationId,
    records.filter((item) => item.id !== id),
  );
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const };
}

export async function saveTrainingFile(id: string, file: File) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Training record not found.", status: 404 as const };
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
  const previousPath = record.filePath ?? "";
  const next = records.map((item) => item.id === id ? { ...item, fileName, filePath, fileType: mime } : item);
  const saved = await writeIndex(store.supabase, store.scope.organizationId, next);
  if (!saved.ok) {
    await store.supabase.storage.from(bucket).remove([filePath]);
    return saved;
  }
  if (previousPath && previousPath !== filePath) await store.supabase.storage.from(bucket).remove([previousPath]);
  const updated = next.find((item) => item.id === id);
  return { ok: true as const, status: 200 as const, record: updated ?? record };
}

export async function removeTrainingFile(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record) return { ok: false as const, error: "Training record not found.", status: 404 as const };
  if (record.filePath) await store.supabase.storage.from(bucket).remove([record.filePath]);
  const next = records.map((item) => {
    if (item.id !== id) return item;
    return {
      id: item.id,
      personName: item.personName,
      role: item.role,
      trainer: item.trainer,
      trainedOn: item.trainedOn,
      documentId: item.documentId,
      documentNumber: item.documentNumber,
      documentTitle: item.documentTitle,
      revisionId: item.revisionId,
      revision: item.revision,
    };
  });
  const saved = await writeIndex(store.supabase, store.scope.organizationId, next);
  if (!saved.ok) return saved;
  const updated = next.find((item) => item.id === id);
  return { ok: true as const, status: 200 as const, record: updated ?? record };
}

export async function readTrainingFile(id: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const records = await readIndex(store.supabase, store.scope.organizationId);
  const record = records.find((item) => item.id === id);
  if (!record?.filePath || !record.fileName) {
    return { ok: false as const, error: "No signed sheet is stored for this record.", status: 404 as const };
  }
  const prefix = filePrefix(store.scope.organizationId, record.id);
  if (!record.filePath.startsWith(prefix)) {
    return { ok: false as const, error: "No signed sheet is stored for this record.", status: 404 as const };
  }
  const { data, error } = await store.supabase.storage.from(bucket).download(record.filePath);
  if (error || !data) return { ok: false as const, error: "No signed sheet is stored for this record.", status: 404 as const };
  return {
    ok: true as const,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName: record.fileName,
    fileType: record.fileType || "application/octet-stream",
  };
}
