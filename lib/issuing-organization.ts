import { auth, clerkClient } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk-config";

export async function issuingOrganizationName() {
  if (!isClerkConfigured()) return "";
  try {
    const { orgId } = await auth();
    if (!orgId) return "";
    const organization = await (await clerkClient()).organizations.getOrganization({ organizationId: orgId });
    return organization.name?.trim().slice(0, 120) ?? "";
  } catch {
    return "";
  }
}
