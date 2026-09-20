import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getDataScope() {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  return { userId, organizationId: orgId ?? `user:${userId}` };
}
