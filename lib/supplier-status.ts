export const approvalStatuses = ["Approved", "Conditional", "Suspended"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

export const leadDayOptions = [30, 60, 90] as const;
export type LeadDays = (typeof leadDayOptions)[number];

export type CertificateStatus = "Current" | "Conditional" | "Expiring soon" | "Expired" | "Suspended";

export function isApproval(value: string): value is ApprovalStatus {
  return (approvalStatuses as readonly string[]).includes(value);
}

export function isLeadDays(value: number): value is LeadDays {
  return (leadDayOptions as readonly number[]).includes(value);
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function certificateStatus(
  record: { approval: string; expiresOn: string; leadDays: number },
  today: string,
): CertificateStatus {
  if (record.expiresOn < today) return "Expired";
  const lead = isLeadDays(record.leadDays) ? record.leadDays : 60;
  if (record.expiresOn <= addDays(today, lead)) return "Expiring soon";
  if (record.approval === "Suspended") return "Suspended";
  if (record.approval === "Conditional") return "Conditional";
  return "Current";
}
