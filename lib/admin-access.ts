import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk-config";

export function adminEmails() {
  return (process.env.DGQI_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  if (!isClerkConfigured()) return { ok: false as const, status: 401 as const, error: "Authentication required." };
  const user = await currentUser();
  if (!user) return { ok: false as const, status: 401 as const, error: "Authentication required." };
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
  const allowed = adminEmails();
  if (!email || !allowed.includes(email)) {
    return { ok: false as const, status: 404 as const, error: "This page is not available." };
  }
  return { ok: true as const, userId: user.id, email };
}
