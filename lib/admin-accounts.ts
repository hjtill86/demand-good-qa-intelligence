import { clerkClient, type User } from "@clerk/nextjs/server";
import type { StripePlanKey } from "./integration-config";
import { getSupabaseAdmin } from "./supabase-server";
import { capMostGoodOrganizations, leaveSharedSeat, loginLimit, readSeats, releaseMostGoodSeats } from "./team-seats";

export type AdminSummary = {
  userId: string;
  email: string;
  name: string;
  plan: StripePlanKey;
  createdAt: string;
};

export type AdminAccount = AdminSummary & {
  lastSignInAt: string;
  loginPack: boolean;
  loginLimit: number;
  seatOwnerEmail: string;
  organizations: { id: string; name: string; role: string; members: number; maxMembers: number }[];
  seats: { email: string; status: "Joined" | "Invited" }[];
  workspaceId: string;
  registers: {
    documents: number | null;
    training: number | null;
    complaints: number | null;
    suppliers: number | null;
    licenses: number | null;
  };
};

function emailOf(user: User) {
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
}

function nameOf(user: User) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username || emailOf(user) || user.id;
}

function stamp(value: Date | number | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function planOf(user: User): StripePlanKey {
  return user.publicMetadata?.dgqiPlan === "most-good" ? "most-good" : "foundation";
}

function summarize(user: User): AdminSummary {
  return {
    userId: user.id,
    email: emailOf(user),
    name: nameOf(user),
    plan: planOf(user),
    createdAt: stamp(user.createdAt),
  };
}

async function countIndex(bucket: string, organizationId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).download(`${encodeURIComponent(organizationId)}/index.json`);
  if (error || !data) return 0;
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return null;
  }
}

async function countLicenses(organizationId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { count, error } = await supabase
    .from("dgqi_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("record_type", "license");
  if (error) return null;
  return count ?? 0;
}

export async function listRecentAccounts() {
  const client = await clerkClient();
  const result = await client.users.getUserList({ limit: 20, orderBy: "-created_at" });
  return result.data.map(summarize);
}

export async function findAccount(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false as const, error: "Enter an email address.", status: 400 as const };
  const client = await clerkClient();
  const result = await client.users.getUserList({ emailAddress: [normalized], limit: 5 });
  const user = result.data.find((item) => emailOf(item) === normalized) ?? result.data[0];
  if (!user) return { ok: false as const, error: "No account uses that email.", status: 404 as const };

  const ownerId = typeof user.publicMetadata?.dgqiSeatOwnerId === "string" ? user.publicMetadata.dgqiSeatOwnerId : "";
  const owner = ownerId && ownerId !== user.id ? await client.users.getUser(ownerId).catch(() => null) : user;
  const memberships = await client.users.getOrganizationMembershipList({ userId: user.id, limit: 20 });
  const scopeMemberships = owner && owner.id !== user.id
    ? await client.users.getOrganizationMembershipList({ userId: owner.id, limit: 20 })
    : memberships;
  const workspaceId = scopeMemberships.data[0]?.organization.id ?? `user:${owner?.id ?? user.id}`;
  const seats = readSeats(owner?.privateMetadata?.dgqiSeats);
  const [documents, training, complaints, suppliers, licenses] = await Promise.all([
    countIndex("dgqi-documents", workspaceId),
    countIndex("dgqi-training", workspaceId),
    countIndex("dgqi-events", workspaceId),
    countIndex("dgqi-suppliers", workspaceId),
    countLicenses(workspaceId),
  ]);

  const account: AdminAccount = {
    ...summarize(user),
    lastSignInAt: stamp(user.lastSignInAt),
    loginPack: user.publicMetadata?.dgqiLoginPacks === 1 || user.publicMetadata?.dgqiLoginPacks === "1",
    loginLimit: loginLimit(user.publicMetadata),
    seatOwnerEmail: owner && owner.id !== user.id ? emailOf(owner) : "",
    organizations: memberships.data.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role.replace(/^org:/, ""),
      members: membership.organization.membersCount ?? 0,
      maxMembers: membership.organization.maxAllowedMemberships ?? 0,
    })),
    seats: owner && owner.id === user.id
      ? seats.map((seat) => ({ email: seat.email, status: seat.userId ? "Joined" as const : "Invited" as const }))
      : [],
    workspaceId,
    registers: { documents, training, complaints, suppliers, licenses },
  };
  return { ok: true as const, account };
}

export async function setAccountPlan(userId: string, plan: StripePlanKey) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  if (!user) return { ok: false as const, error: "Account not found.", status: 404 as const };
  await leaveSharedSeat(userId);
  await client.users.updateUserMetadata(userId, { publicMetadata: { dgqiPlan: plan } });
  if (plan === "foundation") await releaseMostGoodSeats(userId);
  if (plan === "most-good") await capMostGoodOrganizations(userId);
  return { ok: true as const };
}

export async function setLoginPack(userId: string, active: boolean) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  if (!user) return { ok: false as const, error: "Account not found.", status: 404 as const };
  await client.users.updateUserMetadata(userId, { publicMetadata: { dgqiLoginPacks: active ? 1 : 0 } });
  await capMostGoodOrganizations(userId);
  return { ok: true as const };
}
