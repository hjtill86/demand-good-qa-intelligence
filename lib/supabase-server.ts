import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk-config";
import { workspaceOrganizationId } from "./team-seats";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const getDataScope = cache(async () => {
  if (!isClerkConfigured()) return null;
  const { userId, orgId } = await auth();
  if (!userId) return null;
  try {
    return { userId, organizationId: await workspaceOrganizationId(userId, orgId) };
  } catch (error) {
    console.error("Could not resolve the company workspace.", error);
    return { userId, organizationId: orgId ?? `user:${userId}` };
  }
});
