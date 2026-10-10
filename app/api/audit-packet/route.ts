import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listAuditEvents } from "../../../lib/audit-trail";
import { buildAuditPacket } from "../../../lib/audit-packet";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { listControlledDocuments } from "../../../lib/controlled-documents";
import { getDashboardData } from "../../../lib/dashboard-data";
import { getDgqiPlan } from "../../../lib/dgqi-entitlements";
import { issuingOrganizationName } from "../../../lib/issuing-organization";
import { listStoredLicenses } from "../../../lib/license-files";
import { listValidationPackages } from "../../../lib/part11-validation";
import { listQualityEvents } from "../../../lib/quality-events";
import { listSupplierFiles } from "../../../lib/supplier-files";
import { listTrainingRecords } from "../../../lib/training-records";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [documents, training, events, suppliers, auditEvents] = await Promise.all([
    listControlledDocuments(),
    listTrainingRecords(),
    listQualityEvents(),
    listSupplierFiles(),
    listAuditEvents(),
  ]);
  const failure = [documents, training, events, suppliers, auditEvents].find((result) => !result.ok);
  if (failure && !failure.ok) {
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  if (!documents.ok || !training.ok || !events.ok || !suppliers.ok || !auditEvents.ok) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const hasMostGood = getDgqiPlan(user) === "most-good";
  const preparedOn = new Date().toISOString().slice(0, 10);
  let licenses = null;
  let supplierRisk = null;
  let validations = null;
  if (hasMostGood) {
    licenses = (await listStoredLicenses()) ?? [];
    try {
      supplierRisk = (await getDashboardData()).supplierRisk;
    } catch {
      supplierRisk = [];
    }
    const stored = await listValidationPackages();
    if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });
    validations = stored.packages;
  }

  const buffer = await buildAuditPacket({
    organizationName: await issuingOrganizationName(),
    preparedOn,
    planLabel: hasMostGood ? "Most Good" : "Foundation",
    documents: documents.documents,
    training: training.records,
    events: events.records,
    suppliers: suppliers.records,
    licenses,
    supplierRisk,
    auditEvents: auditEvents.events,
    auditTruncated: auditEvents.truncated,
    validations,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="auditor-packet-${preparedOn}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
