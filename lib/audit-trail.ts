import { currentAuditActor } from "./audit-actor";
import type { AuditEvent } from "./part11-records";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";

const bucket = "dgqi-audit";
const listCap = 100;

type Store = NonNullable<ReturnType<typeof getSupabaseAdmin>>;
type Step = { ok: true } | { ok: false; error: string; status: number };

export type AuditDraft = Omit<AuditEvent, "id" | "at" | "userId" | "printedName" | "email" | "actorName" | "actorEmail">;

function prefix(organizationId: string) {
  return `${encodeURIComponent(organizationId)}/`;
}

function objectName() {
  const inverted = String(9_999_999_999_999 - Date.now()).padStart(13, "0");
  return `${inverted}_${crypto.randomUUID()}.json`;
}

async function ensureBucket(supabase: Store) {
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return null;
  const created = await supabase.storage.createBucket(bucket, { public: false });
  if (created.error && !/already exists/i.test(created.error.message)) return created.error.message;
  return null;
}

function isEvent(value: unknown): value is AuditEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<AuditEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.at === "string" &&
    typeof event.userId === "string" &&
    typeof event.printedName === "string" &&
    typeof event.email === "string" &&
    typeof event.action === "string" &&
    typeof event.recordType === "string" &&
    typeof event.recordId === "string" &&
    typeof event.recordLabel === "string" &&
    typeof event.meaning === "string" &&
    Array.isArray(event.changes)
  );
}

export async function appendAudit(supabase: Store, organizationId: string, draft: AuditDraft): Promise<Step> {
  if (draft.action === "update" && draft.changes.length === 0) return { ok: true };
  const actor = await currentAuditActor();
  if (!actor) return { ok: false, error: "Authentication required.", status: 401 };
  const ready = await ensureBucket(supabase);
  if (ready) return { ok: false, error: ready, status: 500 };
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    userId: actor.userId,
    printedName: actor.printedName,
    email: actor.email,
    actorName: actor.actorName,
    actorEmail: actor.actorEmail,
    action: draft.action,
    recordType: draft.recordType,
    recordId: draft.recordId,
    recordLabel: draft.recordLabel,
    meaning: draft.meaning,
    changes: draft.changes,
  };
  const { error } = await supabase.storage.from(bucket).upload(
    `${prefix(organizationId)}${objectName()}`,
    Buffer.from(JSON.stringify(event)),
    { contentType: "application/json", upsert: false },
  );
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

export async function keepAuditedChange(
  supabase: Store,
  organizationId: string,
  draft: AuditDraft,
  write: () => Promise<Step>,
  revert: () => Promise<Step>,
): Promise<Step> {
  if (draft.action === "update" && draft.changes.length === 0) return write();
  const saved = await write();
  if (!saved.ok) return saved;
  const logged = await appendAudit(supabase, organizationId, draft);
  if (logged.ok) return { ok: true };
  const undone = await revert();
  if (!undone.ok) {
    console.error("Audit trail write failed after the record changed.", logged.error);
    return {
      ok: false,
      error: "The record changed, but the audit trail could not be written. Contact support before continuing.",
      status: 500,
    };
  }
  return { ok: false, error: "The change was not kept because the audit trail could not be written.", status: 500 };
}

export async function listAuditEvents() {
  const scope = await getDataScope();
  const supabase = getSupabaseAdmin();
  if (!scope) return { ok: false as const, error: "Authentication required.", status: 401 as const };
  if (!supabase) return { ok: false as const, error: "Supabase is not configured.", status: 503 as const };
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) return { ok: true as const, status: 200 as const, events: [] as AuditEvent[], truncated: false };
  const names: string[] = [];
  let offset = 0;
  while (names.length <= listCap) {
    const listed = await supabase.storage.from(bucket).list(encodeURIComponent(scope.organizationId), {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (listed.error) return { ok: false as const, error: listed.error.message, status: 500 as const };
    const page = (listed.data ?? []).filter((item) => item.id && item.name.endsWith(".json"));
    names.push(...page.map((item) => item.name));
    if (!listed.data || listed.data.length < 100) break;
    offset += listed.data.length;
  }
  const selected = names.slice(0, listCap);
  const events: AuditEvent[] = [];
  for (let index = 0; index < selected.length; index += 20) {
    const batch = selected.slice(index, index + 20);
    const downloaded = await Promise.all(batch.map(async (name) => {
      const file = await supabase.storage.from(bucket).download(`${prefix(scope.organizationId)}${name}`);
      if (file.error || !file.data) return null;
      try {
        const parsed: unknown = JSON.parse(await file.data.text());
        return isEvent(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }));
    for (const event of downloaded) {
      if (event) events.push({ ...event, actorName: event.actorName ?? "", actorEmail: event.actorEmail ?? "" });
    }
  }
  events.sort((left, right) => right.at.localeCompare(left.at));
  return { ok: true as const, status: 200 as const, events, truncated: names.length > listCap };
}
