import { createHash } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import type { LicenseRecord } from "./dashboard-data";

const EMAIL_ALERT_METADATA_KEY = "licenseAlertEmails";
const LAST_DIGEST_METADATA_KEY = "licenseAlertLastSentDigest";

type LicenseAlertMetadata = {
  enabled: boolean;
  lastSentDigest?: string;
};

export function getRenewalRecords(records: LicenseRecord[]) {
  return records.filter((record) => record.status !== "Current");
}

export function getLicenseAlertDigest(records: LicenseRecord[]) {
  const value = records
    .map((record) => `${record.licenseNumber}:${record.status}:${record.expiresOn}`)
    .sort()
    .join("|");
  return createHash("sha256").update(value).digest("hex");
}

export async function getLicenseAlertMetadata(userId: string): Promise<LicenseAlertMetadata> {
  const user = await (await clerkClient()).users.getUser(userId);
  const metadata = user.privateMetadata as Record<string, unknown>;
  return {
    enabled: metadata[EMAIL_ALERT_METADATA_KEY] === true,
    lastSentDigest:
      typeof metadata[LAST_DIGEST_METADATA_KEY] === "string"
        ? metadata[LAST_DIGEST_METADATA_KEY]
        : undefined,
  };
}

export async function setLicenseAlertEmailPreference(userId: string, enabled: boolean) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [EMAIL_ALERT_METADATA_KEY]: enabled },
  });
}

export async function markLicenseAlertsSent(userId: string, digest: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [LAST_DIGEST_METADATA_KEY]: digest },
  });
}

export async function sendLicenseAlertEmail(
  recipient: string,
  records: LicenseRecord[],
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_ALERT_FROM;
  if (!apiKey || !from) {
    throw new Error("Email alerts require RESEND_API_KEY and LICENSE_ALERT_FROM.");
  }

  const resend = new Resend(apiKey);
  const rows = records
    .map(
      (record) =>
        `<tr><td>${record.company} — ${record.documentName}</td><td>${record.status}</td><td>${record.expiresOn}</td></tr>`,
    )
    .join("");

  const result = await resend.emails.send({
    from,
    to: recipient,
    subject: "Demand Good QA: license renewal alert",
    html: `<p>The following license or certification records need attention:</p><table border="1" cellpadding="8" cellspacing="0"><thead><tr><th>Record</th><th>Status</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table><p>Review your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/licenses">license vault</a> for details.</p>`,
  });

  if (result.error) {
    throw new Error(`Email provider rejected the alert: ${result.error.message}`);
  }
}
