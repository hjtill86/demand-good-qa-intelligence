import { currentUser } from "@clerk/nextjs/server";
import { keepAuditedChange, type AuditDraft } from "./audit-trail";
import { currentAuditActor } from "./audit-actor";
import { isClerkConfigured } from "./clerk-config";
import { getDgqiPlan } from "./dgqi-entitlements";
import {
  blankValidationTest,
  part11Protocol,
  validationReadyToSign,
  type ValidationPackage,
  type ValidationTestRecord,
  type ValidationTestResult,
} from "./part11-protocol";
import { changedFields, formatSignature, isRecordSignature } from "./part11-records";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";
import { requireSignature } from "./verify-signer";

const bucket = "dgqi-validation";
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

type Failure = { ok: false; error: string; status: number };
type Store = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isResult(value: string): value is ValidationTestResult {
  return value === "" || value === "Pass" || value === "Fail";
}

function isTest(value: unknown): value is ValidationTestRecord {
  if (!value || typeof value !== "object") return false;
  const test = value as Partial<ValidationTestRecord>;
  return (
    typeof test.id === "string" &&
    typeof test.result === "string" &&
    isResult(test.result) &&
    typeof test.notes === "string" &&
    typeof test.recordedBy === "string" &&
    typeof test.recordedAt === "string"
  );
}

function isPackage(value: unknown): value is ValidationPackage {
  if (!value || typeof value !== "object") return false;
  const pkg = value as Partial<ValidationPackage>;
  return (
    typeof pkg.id === "string" &&
    typeof pkg.protocolRevision === "string" &&
    typeof pkg.protocolDated === "string" &&
    Array.isArray(pkg.tests) &&
    pkg.tests.every(isTest) &&
    (pkg.signature === undefined || isRecordSignature(pkg.signature))
  );
}

function alignPackage(pkg: ValidationPackage): ValidationPackage {
  if (pkg.signature || pkg.protocolRevision !== part11Protocol.revision) return pkg;
  return {
    ...pkg,
    tests: part11Protocol.tests.map((spec) => pkg.tests.find((test) => test.id === spec.id) ?? blankValidationTest(spec.id)),
  };
}

function indexPath(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/index.json`;
}

function filePrefix(organizationId: string, packageId: string, testId: string) {
  return `${encodeURIComponent(organizationId)}/${packageId}/${testId}/`;
}

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "validation-evidence";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "validation-evidence";
}

function extensionOf(name: string) {
  return /\.([a-zA-Z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";
}

async function requireMostGood(): Promise<{ ok: true } | Failure> {
  if (!isClerkConfigured()) return { ok: false, error: "Authentication required.", status: 401 };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Authentication required.", status: 401 };
  if (getDgqiPlan(user) !== "most-good") {
    return { ok: false, error: "Running and signing this validation is included with Most Good.", status: 403 };
  }
  return { ok: true };
}

async function openStore(): Promise<{ scope: { organizationId: string; userId: string }; supabase: Store } | Failure> {
  const allowed = await requireMostGood();
  if (!allowed.ok) return allowed;
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
  if (error || !data) return [] as ValidationPackage[];
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(isPackage).map(alignPackage) : [];
  } catch {
    return [];
  }
}

async function writeIndex(supabase: Store, organizationId: string, packages: ValidationPackage[]) {
  const body = JSON.stringify(packages);
  if (Buffer.byteLength(body) > maxIndexBytes) {
    return { ok: false as const, error: "The validation record is too large.", status: 413 as const };
  }
  const { error } = await supabase.storage.from(bucket).upload(indexPath(organizationId), Buffer.from(body), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 500 as const };
  return { ok: true as const };
}

function packageSnapshot(pkg: ValidationPackage) {
  return {
    revision: pkg.protocolRevision,
    dated: pkg.protocolDated,
    signature: pkg.signature ? formatSignature(pkg.signature) : "",
    tests: pkg.tests.map((test) => `${test.id} ${test.result || "Not run"} ${test.notes} ${test.fileName ?? ""}`.trim()).join(" | "),
  };
}

function packageLabel(pkg: ValidationPackage) {
  return `Part 11 validation revision ${pkg.protocolRevision}`;
}

async function persistPackages(
  store: { supabase: Store; scope: { organizationId: string } },
  previous: ValidationPackage[],
  next: ValidationPackage[],
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

export async function listValidationPackages() {
  const store = await openStore();
  if ("ok" in store) return store;
  return { ok: true as const, status: 200 as const, packages: await readIndex(store.supabase, store.scope.organizationId) };
}

export async function startValidationPackage() {
  const store = await openStore();
  if ("ok" in store) return store;
  const packages = await readIndex(store.supabase, store.scope.organizationId);
  const existing = packages.find((pkg) => pkg.protocolRevision === part11Protocol.revision);
  if (existing?.signature) {
    return { ok: false as const, error: "This revision is already signed. It stays on the account. A later software revision opens a new validation.", status: 409 as const };
  }
  if (existing) return { ok: true as const, status: 200 as const, package: existing };
  const created: ValidationPackage = {
    id: crypto.randomUUID(),
    protocolRevision: part11Protocol.revision,
    protocolDated: part11Protocol.dated,
    tests: part11Protocol.tests.map((spec) => blankValidationTest(spec.id)),
  };
  const saved = await persistPackages(store, packages, [created, ...packages], {
    action: "create",
    recordType: "validation",
    recordId: created.id,
    recordLabel: packageLabel(created),
    meaning: "",
    changes: changedFields({}, packageSnapshot(created)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 201 as const, package: created };
}

export async function recordValidationTest(packageId: string, testId: string, input: unknown) {
  const fields = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const result = text(fields.result, 10);
  const notes = text(fields.notes, 4000);
  if (result !== "Pass" && result !== "Fail") {
    return { ok: false as const, error: "Mark the test Pass or Fail.", status: 400 as const };
  }
  if (!part11Protocol.tests.some((spec) => spec.id === testId)) {
    return { ok: false as const, error: "That test is not in this protocol.", status: 400 as const };
  }
  const store = await openStore();
  if ("ok" in store) return store;
  const actor = await currentAuditActor();
  if (!actor) return { ok: false as const, error: "Authentication required.", status: 401 as const };
  const packages = await readIndex(store.supabase, store.scope.organizationId);
  const pkg = packages.find((item) => item.id === packageId);
  if (!pkg) return { ok: false as const, error: "Validation package not found.", status: 404 as const };
  if (pkg.signature) {
    return { ok: false as const, error: "This signed validation stays as it was signed.", status: 409 as const };
  }
  const previous = structuredClone(packages);
  const before = packageSnapshot(pkg);
  const nextTest: ValidationTestRecord = {
    ...(pkg.tests.find((test) => test.id === testId) ?? blankValidationTest(testId)),
    id: testId,
    result,
    notes,
    recordedBy: actor.printedName,
    recordedAt: new Date().toISOString(),
  };
  pkg.tests = part11Protocol.tests.map((spec) => {
    if (spec.id === testId) return nextTest;
    return pkg.tests.find((test) => test.id === spec.id) ?? blankValidationTest(spec.id);
  });
  const saved = await persistPackages(store, previous, packages, {
    action: "update",
    recordType: "validation",
    recordId: pkg.id,
    recordLabel: `${packageLabel(pkg)} ${testId}`,
    meaning: "",
    changes: changedFields(before, packageSnapshot(pkg)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, package: pkg };
}

export async function signValidationPackage(packageId: string, password: unknown) {
  const store = await openStore();
  if ("ok" in store) return store;
  const packages = await readIndex(store.supabase, store.scope.organizationId);
  const pkg = packages.find((item) => item.id === packageId);
  if (!pkg) return { ok: false as const, error: "Validation package not found.", status: 404 as const };
  if (pkg.signature) {
    return { ok: false as const, error: "This validation is already signed.", status: 409 as const };
  }
  if (!validationReadyToSign(pkg)) {
    return {
      ok: false as const,
      error: "Mark every test Pass and write what you saw before signing. A failed test stays until you run it again and mark it Pass.",
      status: 400 as const,
    };
  }
  const signed = await requireSignature(password, "approval");
  if (!signed.ok) return signed;
  const previous = structuredClone(packages);
  const before = packageSnapshot(pkg);
  pkg.signature = signed.signature;
  const saved = await persistPackages(store, previous, packages, {
    action: "sign",
    recordType: "validation",
    recordId: pkg.id,
    recordLabel: packageLabel(pkg),
    meaning: "approval",
    changes: changedFields(before, packageSnapshot(pkg)),
  });
  if (!saved.ok) return saved;
  return { ok: true as const, status: 200 as const, package: pkg };
}

export async function saveValidationEvidence(packageId: string, testId: string, file: File) {
  if (!part11Protocol.tests.some((spec) => spec.id === testId)) {
    return { ok: false as const, error: "That test is not in this protocol.", status: 400 as const };
  }
  const store = await openStore();
  if ("ok" in store) return store;
  const packages = await readIndex(store.supabase, store.scope.organizationId);
  const pkg = packages.find((item) => item.id === packageId);
  if (!pkg) return { ok: false as const, error: "Validation package not found.", status: 404 as const };
  if (pkg.signature) {
    return { ok: false as const, error: "This signed validation stays as it was signed.", status: 409 as const };
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
  const filePath = `${filePrefix(store.scope.organizationId, pkg.id, testId)}${fileName}`;
  const { error: uploadError } = await store.supabase.storage.from(bucket).upload(filePath, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (uploadError) return { ok: false as const, error: uploadError.message, status: 500 as const };
  const previous = structuredClone(packages);
  const before = packageSnapshot(pkg);
  const current = pkg.tests.find((test) => test.id === testId) ?? blankValidationTest(testId);
  const nextTest: ValidationTestRecord = { ...current, id: testId, fileName, filePath, fileType: mime };
  pkg.tests = part11Protocol.tests.map((spec) => {
    if (spec.id === testId) return nextTest;
    return pkg.tests.find((test) => test.id === spec.id) ?? blankValidationTest(spec.id);
  });
  const saved = await persistPackages(store, previous, packages, {
    action: "update",
    recordType: "validation",
    recordId: pkg.id,
    recordLabel: `${packageLabel(pkg)} ${testId}`,
    meaning: "",
    changes: changedFields(before, packageSnapshot(pkg)),
  });
  if (!saved.ok) {
    await store.supabase.storage.from(bucket).remove([filePath]);
    return saved;
  }
  return { ok: true as const, status: 200 as const, package: pkg };
}

export async function readValidationEvidence(packageId: string, testId: string) {
  const store = await openStore();
  if ("ok" in store) return store;
  const packages = await readIndex(store.supabase, store.scope.organizationId);
  const pkg = packages.find((item) => item.id === packageId);
  const test = pkg?.tests.find((item) => item.id === testId);
  if (!pkg || !test?.filePath || !test.fileName) {
    return { ok: false as const, error: "No evidence file is stored for this test.", status: 404 as const };
  }
  const prefix = filePrefix(store.scope.organizationId, pkg.id, testId);
  if (!test.filePath.startsWith(prefix)) {
    return { ok: false as const, error: "No evidence file is stored for this test.", status: 404 as const };
  }
  const { data, error } = await store.supabase.storage.from(bucket).download(test.filePath);
  if (error || !data) return { ok: false as const, error: "No evidence file is stored for this test.", status: 404 as const };
  return {
    ok: true as const,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName: test.fileName,
    fileType: test.fileType || "application/octet-stream",
  };
}
