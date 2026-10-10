export type SignatureMeaning = "approval" | "closure";

export type RecordSignature = {
  userId: string;
  printedName: string;
  email: string;
  meaning: SignatureMeaning;
  signedAt: string;
};

export type AuditChange = {
  field: string;
  before: string;
  after: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  userId: string;
  printedName: string;
  email: string;
  actorName: string;
  actorEmail: string;
  action: "create" | "update" | "delete" | "sign";
  recordType: "document" | "training" | "complaint" | "supplier" | "validation";
  recordId: string;
  recordLabel: string;
  meaning: string;
  changes: AuditChange[];
};

export function formatUtc(iso: string) {
  return iso.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function formatSignature(signature: RecordSignature) {
  const meaning = signature.meaning === "closure" ? "closure" : "approval";
  return `${signature.printedName} · ${meaning} · ${formatUtc(signature.signedAt)}`;
}

export function isRecordSignature(value: unknown): value is RecordSignature {
  if (!value || typeof value !== "object") return false;
  const signature = value as Partial<RecordSignature>;
  return (
    typeof signature.userId === "string" &&
    typeof signature.printedName === "string" &&
    typeof signature.email === "string" &&
    (signature.meaning === "approval" || signature.meaning === "closure") &&
    typeof signature.signedAt === "string"
  );
}

export function signatureList(value: unknown): RecordSignature[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecordSignature);
}

export function changedFields(before: Record<string, string>, after: Record<string, string>): AuditChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((field) => {
    const left = before[field] ?? "";
    const right = after[field] ?? "";
    if (left === right) return [];
    return [{ field, before: left.slice(0, 2000), after: right.slice(0, 2000) }];
  });
}

export function documentIsRetained(revisionStatuses: string[]) {
  return revisionStatuses.some((status) => status === "Approved" || status === "Retired");
}

export function eventDeleteBlocked(record: { status: string; signatures?: unknown; closedOnce?: boolean }) {
  return record.status === "Closed" || record.closedOnce === true || signatureList(record.signatures).length > 0;
}

export function supplierIsRetained(record: { approval: string; retained?: boolean; signatures?: unknown }) {
  return record.retained === true || record.approval === "Approved" || signatureList(record.signatures).length > 0;
}
