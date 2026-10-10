import { getDataScope, getSupabaseAdmin } from "./supabase-server";
import type { LicenseRecord } from "./dashboard-data";

const bucket = "dgqi-licenses";
const maxBytes = 10 * 1024 * 1024;

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type StoredLicense = LicenseRecord & {
  id: string;
  fileName?: string;
};

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "document";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "document";
}

function extensionOf(name: string) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match?.[1]?.toLowerCase() ?? "";
}

function folderFor(organizationId: string, recordId: string) {
  return `${encodeURIComponent(organizationId)}/${recordId}`;
}

function isLicensePayload(value: unknown): value is LicenseRecord & { fileName?: string; filePath?: string; fileType?: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.company === "string" &&
    typeof record.documentName === "string" &&
    (record.documentType === "License" || record.documentType === "Certification") &&
    typeof record.jurisdiction === "string" &&
    typeof record.licenseNumber === "string" &&
    typeof record.expiresOn === "string" &&
    (record.renewalLeadDays === 30 || record.renewalLeadDays === 60 || record.renewalLeadDays === 90) &&
    (record.status === "Current" || record.status === "Renewal due" || record.status === "Expiring soon")
  );
}

async function ensureBucket(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return null;
  const created = await supabase.storage.createBucket(bucket, { public: false });
  if (created.error && !/already exists/i.test(created.error.message)) return created.error;
  return null;
}

async function licenseRow(recordId: string) {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return { error: "Authentication required.", status: 401 as const };
  if (!supabase) return { error: "Supabase is not configured.", status: 503 as const };
  const { data, error } = await supabase
    .from("dgqi_records")
    .select("id,payload")
    .eq("id", recordId)
    .eq("organization_id", scope.organizationId)
    .eq("record_type", "license")
    .maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!data || !isLicensePayload(data.payload)) return { error: "License record not found.", status: 404 as const };
  return { scope, supabase, payload: data.payload };
}

export async function listStoredLicenses(): Promise<StoredLicense[] | null> {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope || !supabase) return null;
  const { data, error } = await supabase
    .from("dgqi_records")
    .select("id,payload")
    .eq("organization_id", scope.organizationId)
    .eq("record_type", "license")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.flatMap((row) => {
    if (!isLicensePayload(row.payload)) return [];
    return [{ ...row.payload, id: row.id, fileName: typeof row.payload.fileName === "string" ? row.payload.fileName : undefined }];
  });
}

export async function saveLicenseFile(recordId: string, file: File) {
  const row = await licenseRow(recordId);
  if ("error" in row) return row;
  const ready = await ensureBucket(row.supabase);
  if (ready) return { error: ready.message, status: 500 as const };

  const fileName = safeFileName(file.name);
  const mime = mimeByExtension[extensionOf(fileName)];
  const jpegAlias = mime === "image/jpeg" && file.type === "image/jpg";
  if (!mime || (file.type && file.type !== mime && !jpegAlias)) {
    return { error: "Upload a PDF, PNG, JPG, or WebP file.", status: 400 as const };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.byteLength) return { error: "The file is empty.", status: 400 as const };
  if (bytes.byteLength > maxBytes) return { error: "Files must be 10 MB or smaller.", status: 413 as const };

  const filePath = `${folderFor(row.scope.organizationId, recordId)}/${fileName}`;
  const { error: uploadError } = await row.supabase.storage.from(bucket).upload(filePath, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (uploadError) return { error: uploadError.message, status: 500 as const };

  const previousPath = typeof row.payload.filePath === "string" ? row.payload.filePath : "";
  const { error: updateError } = await row.supabase
    .from("dgqi_records")
    .update({
      payload: { ...row.payload, fileName, filePath, fileType: mime },
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .eq("organization_id", row.scope.organizationId)
    .eq("record_type", "license");
  if (updateError) {
    await row.supabase.storage.from(bucket).remove([filePath]);
    return { error: updateError.message, status: 500 as const };
  }
  if (previousPath && previousPath !== filePath) {
    await row.supabase.storage.from(bucket).remove([previousPath]);
  }
  return { error: null, status: 200 as const, fileName };
}

export async function readLicenseFile(recordId: string) {
  const row = await licenseRow(recordId);
  if ("error" in row) return row;
  const filePath = row.payload.filePath;
  const fileName = row.payload.fileName;
  const fileType = row.payload.fileType;
  const prefix = `${folderFor(row.scope.organizationId, recordId)}/`;
  if (typeof filePath !== "string" || !filePath.startsWith(prefix) || typeof fileName !== "string") {
    return { error: "No file is stored for this record.", status: 404 as const };
  }
  const { data, error } = await row.supabase.storage.from(bucket).download(filePath);
  if (error || !data) return { error: "No file is stored for this record.", status: 404 as const };
  return {
    error: null,
    status: 200 as const,
    bytes: Buffer.from(await data.arrayBuffer()),
    fileName,
    fileType: typeof fileType === "string" ? fileType : "application/octet-stream",
  };
}

export async function discardLicenseFile(recordId: string) {
  const row = await licenseRow(recordId);
  if ("error" in row) return;
  const filePath = typeof row.payload.filePath === "string" ? row.payload.filePath : "";
  if (filePath) await row.supabase.storage.from(bucket).remove([filePath]);
}

export async function removeLicenseFile(recordId: string) {
  const row = await licenseRow(recordId);
  if ("error" in row) return row;
  const filePath = typeof row.payload.filePath === "string" ? row.payload.filePath : "";
  if (filePath) {
    await row.supabase.storage.from(bucket).remove([filePath]);
  }
  const payload = { ...row.payload };
  delete payload.fileName;
  delete payload.filePath;
  delete payload.fileType;
  const { error } = await row.supabase
    .from("dgqi_records")
    .update({ payload, updated_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("organization_id", row.scope.organizationId)
    .eq("record_type", "license");
  if (error) return { error: error.message, status: 500 as const };
  return { error: null, status: 200 as const };
}
