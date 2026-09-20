import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "./supabase-server";

export type InviteRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "revoked";

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  role: InviteRole;
  token: string;
  status: InviteStatus;
  invited_by: string;
  invited_by_name: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
};

const INVITES_TABLE = "dgqi_organization_invites";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateToken() {
  return randomBytes(24).toString("hex");
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildInviteUrl(token: string) {
  return `${getAppUrl().replace(/\/$/, "")}/invite/${token}`;
}

export async function listPendingInvites(organizationId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase is not configured." as const };

  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as OrganizationInvite[], error: null };
}

export async function createInvite(params: {
  organizationId: string;
  email: string;
  role: InviteRole;
  invitedBy: string;
  invitedByName?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase is not configured." as const };

  const email = normalizeEmail(params.email);

  // Revoke any existing pending invite for the same email so the partial unique index stays clean.
  await supabase
    .from(INVITES_TABLE)
    .update({ status: "revoked" })
    .eq("organization_id", params.organizationId)
    .eq("email", email)
    .eq("status", "pending");

  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .insert({
      organization_id: params.organizationId,
      email,
      role: params.role,
      token: generateToken(),
      invited_by: params.invitedBy,
      invited_by_name: params.invitedByName ?? null,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as OrganizationInvite, error: null };
}

export async function revokeInvite(organizationId: string, id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { error } = await supabase
    .from(INVITES_TABLE)
    .update({ status: "revoked" })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { error: null };
}

export async function getInviteByToken(token: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase is not configured." as const };

  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as OrganizationInvite | null) ?? null, error: null };
}

export function isInviteExpired(invite: OrganizationInvite) {
  return new Date(invite.expires_at).getTime() < Date.now();
}

export async function acceptInvite(params: { token: string; userId: string }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase is not configured." as const };

  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: params.userId,
    })
    .eq("token", params.token)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as OrganizationInvite | null) ?? null, error: null };
}

export async function sendInviteEmail(invite: OrganizationInvite) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Invitations require RESEND_API_KEY and INVITE_FROM_EMAIL.");
  }

  const resend = new Resend(apiKey);
  const inviteUrl = buildInviteUrl(invite.token);
  const inviter = invite.invited_by_name?.trim() || "A teammate";

  const result = await resend.emails.send({
    from,
    to: invite.email,
    subject: "You're invited to Demand Good QA Intelligence",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="font-size:20px;margin:0 0 16px">You've been invited</h1>
        <p style="margin:0 0 12px;line-height:1.6">
          ${inviter} invited you to join their workspace on <b>Demand Good QA Intelligence</b>
          as ${invite.role === "admin" ? "an admin" : "a member"}.
        </p>
        <p style="margin:0 0 24px;line-height:1.6">
          Click the button below to accept. This invitation expires on
          ${new Date(invite.expires_at).toLocaleDateString()}.
        </p>
        <p style="margin:0 0 24px">
          <a href="${inviteUrl}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
            Accept invitation
          </a>
        </p>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.6">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${inviteUrl}" style="color:#666">${inviteUrl}</a>
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(`Email provider rejected the invitation: ${result.error.message}`);
  }
}
