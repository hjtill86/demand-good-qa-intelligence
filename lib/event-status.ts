export const intakeKinds = ["Complaint", "Deviation"] as const;
export type IntakeKind = (typeof intakeKinds)[number];

export const complaintSources = ["Customer", "Distributor", "Regulatory", "Other"] as const;
export const deviationSources = ["Process", "Supplier", "Internal audit", "Other"] as const;

export type EventDisplayStatus = "Open" | "Overdue" | "Closed";

export function sourcesFor(kind: IntakeKind) {
  return kind === "Complaint" ? complaintSources : deviationSources;
}

export function eventStatus(
  record: { status: string; dueOn: string },
  today: string,
): EventDisplayStatus {
  if (record.status === "Closed") return "Closed";
  if (record.dueOn < today) return "Overdue";
  return "Open";
}
