import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getLicenseAlertMetadata, setLicenseAlertEmailPreference } from "../../../../lib/license-alerts";
import { getThinkificAccess } from "../../../../lib/thinkific-entitlements";

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  const metadata = await getLicenseAlertMetadata(userId);
  const user = await (await clerkClient()).users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "A primary email address is required." }, { status: 400 });
  }

  const access = await getThinkificAccess(email);
  if (access.status !== "active" || access.plan !== "most-good") {
    return NextResponse.json({ error: "Email license alerts are available to Most Good members only." }, { status: 403 });
  }

  await setLicenseAlertEmailPreference(userId, body.enabled);
  return NextResponse.json({ enabled: body.enabled, previouslyEnabled: metadata.enabled });
}
