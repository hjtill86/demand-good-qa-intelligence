import { clerkClient, type User } from "@clerk/nextjs/server";
import { capMostGoodOrganizations, releaseMostGoodSeats } from "./team-seats";
import { getSupabaseAdmin } from "./supabase-server";

export const testWorkspaceEmail = "dgqi-test-workspace@demandgoodqa.com";

const buckets = ["dgqi-documents", "dgqi-training", "dgqi-events", "dgqi-suppliers", "dgqi-qms", "dgqi-licenses"];

function emailOf(user: User) {
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
}

function clerkMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error && Array.isArray(error.errors)) {
    const first = error.errors[0];
    if (first && typeof first === "object") {
      if ("longMessage" in first && typeof first.longMessage === "string") return first.longMessage;
      if ("message" in first && typeof first.message === "string") return first.message;
    }
  }
  return "Could not open the test workspace.";
}

async function workspaceId(userId: string) {
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId, limit: 10 });
  return memberships.data[0]?.organization.id ?? `user:${userId}`;
}

export async function ensureTestWorkspace() {
  const client = await clerkClient();
  const existing = await client.users.getUserList({ emailAddress: [testWorkspaceEmail], limit: 5 });
  const found = existing.data.find((user) => emailOf(user) === testWorkspaceEmail);
  if (found && found.publicMetadata?.dgqiTestAccount !== true) {
    return { ok: false as const, error: "The test email already belongs to a subscriber.", status: 409 as const };
  }
  if (found) return { ok: true as const, user: found };
  try {
    const created = await client.users.createUser({
      emailAddress: [testWorkspaceEmail],
      firstName: "Test",
      lastName: "Workspace",
      skipPasswordRequirement: true,
      publicMetadata: { dgqiPlan: "most-good", dgqiLoginPacks: 1, dgqiTestAccount: true },
    });
    await capMostGoodOrganizations(created.id);
    return { ok: true as const, user: created };
  } catch (error) {
    return { ok: false as const, error: clerkMessage(error), status: 400 as const };
  }
}

async function restoreTestAccess(userId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { dgqiPlan: "most-good", dgqiLoginPacks: 1, dgqiTestAccount: true },
  });
  await capMostGoodOrganizations(userId);
}

async function removeTree(bucket: string, prefix: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (error) return /not found|does not exist/i.test(error.message);
    if (!data?.length) return true;
    const files: string[] = [];
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id == null) {
        const cleared = await removeTree(bucket, path);
        if (!cleared) return false;
      } else {
        files.push(path);
      }
    }
    if (!files.length) return true;
    const removed = await supabase.storage.from(bucket).remove(files);
    if (removed.error) return false;
    if (files.length < 100) return true;
  }
}

export async function resetTestWorkspace() {
  const ensured = await ensureTestWorkspace();
  if (!ensured.ok) return ensured;
  await releaseMostGoodSeats(ensured.user.id);
  await restoreTestAccess(ensured.user.id);
  const scope = await workspaceId(ensured.user.id);
  if (scope !== `user:${ensured.user.id}` && !scope.startsWith("org_")) {
    return { ok: false as const, error: "The test workspace could not be identified.", status: 500 as const };
  }
  const supabase = getSupabaseAdmin();
  let storageCleared = false;
  if (supabase) {
    const results = await Promise.all(buckets.map((bucket) => removeTree(bucket, encodeURIComponent(scope))));
    const deleted = await supabase.from("dgqi_records").delete().eq("organization_id", scope);
    storageCleared = results.every(Boolean) && !deleted.error;
  }
  return { ok: true as const, storageCleared };
}

export async function openTestWorkspace(actorUserId: string) {
  const ensured = await ensureTestWorkspace();
  if (!ensured.ok) return ensured;
  if (ensured.user.id === actorUserId) {
    return { ok: false as const, error: "The admin account cannot be the test workspace.", status: 400 as const };
  }
  try {
    const client = await clerkClient();
    const token = await client.actorTokens.create({
      userId: ensured.user.id,
      actor: { sub: actorUserId },
      expiresInSeconds: 600,
      sessionMaxDurationInSeconds: 60 * 60 * 4,
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://demandgoodqa.com";
    const url = token.url || (token.token ? `${appUrl}/dashboard?__clerk_ticket=${encodeURIComponent(token.token)}` : "");
    if (!url) return { ok: false as const, error: "Clerk did not return a test sign-in link.", status: 500 as const };
    return { ok: true as const, url };
  } catch (error) {
    return { ok: false as const, error: clerkMessage(error), status: 400 as const };
  }
}
