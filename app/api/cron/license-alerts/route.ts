import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDashboardData } from "../../../../lib/dashboard-data";
import {
  getLicenseAlertDigest,
  getLicenseAlertMetadata,
  getRenewalRecords,
  markLicenseAlertsSent,
  sendLicenseAlertEmail,
} from "../../../../lib/license-alerts";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const records = getRenewalRecords((await getDashboardData()).licenseRecords);
  const digest = getLicenseAlertDigest(records);
  const users = await (await clerkClient()).users.getUserList({ limit: 100 });
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users.data) {
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) continue;

    const metadata = await getLicenseAlertMetadata(user.id);
    if (!metadata.enabled || metadata.lastSentDigest === digest) {
      skipped++;
      continue;
    }

    if (user.publicMetadata?.dgqiPlan !== "most-good") {
      skipped++;
      continue;
    }

    try {
      await sendLicenseAlertEmail(email, records);
      await markLicenseAlertsSent(user.id, digest);
      sent++;
    } catch (error) {
      failed++;
      console.error(`License alert email failed for ${email}`, error);
    }
  }

  return NextResponse.json({ sent, skipped, failed, records: records.length });
}
