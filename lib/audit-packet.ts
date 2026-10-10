import ExcelJS from "exceljs";
import type { ControlledDocument } from "./controlled-documents";
import type { LicenseRecord } from "./dashboard-data";
import type { SupplierRisk } from "./dashboard-data";
import { eventStatus } from "./event-status";
import { formatSignature, formatUtc, signatureList, type AuditEvent } from "./part11-records";
import type { QualityEvent } from "./quality-events";
import { certificateStatus } from "./supplier-status";
import type { SupplierFile } from "./supplier-files";
import type { TrainingRecord } from "./training-records";
import { trainingStatus } from "./training-status";

export type AuditLicense = LicenseRecord & { fileName?: string };

export type AuditPacketInput = {
  organizationName: string;
  preparedOn: string;
  planLabel: string;
  documents: ControlledDocument[];
  training: TrainingRecord[];
  events: QualityEvent[];
  suppliers: SupplierFile[];
  licenses: AuditLicense[] | null;
  supplierRisk: SupplierRisk[] | null;
  auditEvents: AuditEvent[];
  auditTruncated: boolean;
};

function yesNo(value: string | undefined) {
  return value ? "Yes" : "No";
}

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, string | number>[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

export async function buildAuditPacket(input: AuditPacketInput) {
  const trainingDocuments = input.documents.map((document) => ({
    id: document.id,
    currentRevisionId: document.current.id,
  }));
  const retrainingDue = input.training.filter((record) => trainingStatus(record, trainingDocuments) === "Retraining due").length;
  const openCapas = input.events.filter((record) => record.status === "Open").length;
  const overdueCapas = input.events.filter((record) => eventStatus(record, input.preparedOn) === "Overdue").length;
  const supplierAttention = input.suppliers.filter((record) => {
    const status = certificateStatus(record, input.preparedOn);
    return status === "Expired" || status === "Expiring soon";
  }).length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Demand Good QA Intelligence";
  workbook.created = new Date(`${input.preparedOn}T00:00:00.000Z`);

  const cover = workbook.addWorksheet("Cover");
  cover.columns = [
    { header: "Item", key: "item", width: 36 },
    { header: "Detail", key: "detail", width: 72 },
  ];
  const coverRows: { item: string; detail: string | number }[] = [
    { item: "Packet", detail: "Auditor packet" },
    { item: "Organization", detail: input.organizationName || "Account workspace" },
    { item: "Prepared", detail: input.preparedOn },
    { item: "Plan", detail: input.planLabel },
    { item: "Controlled documents", detail: input.documents.length },
    { item: "Training records", detail: input.training.length },
    { item: "Training due for retraining", detail: retrainingDue },
    { item: "Complaints and deviations", detail: input.events.length },
    { item: "Open CAPAs", detail: openCapas },
    { item: "CAPAs past the target date", detail: overdueCapas },
    { item: "Approved supplier files", detail: input.suppliers.length },
    { item: "Certificates expired or inside the alert window", detail: supplierAttention },
  ];
  if (input.licenses) coverRows.push({ item: "License and certification records", detail: input.licenses.length });
  if (input.supplierRisk) coverRows.push({ item: "Supplier risk scores", detail: input.supplierRisk.length });
  coverRows.push({
    item: "Audit trail entries in this packet",
    detail: input.auditTruncated ? `${input.auditEvents.length} (latest 100; older entries remain in the workspace)` : input.auditEvents.length,
  });
  coverRows.push({
    item: "Files",
    detail: "This packet lists each record and whether a file is attached. Open the record in the workspace to download the file.",
  });
  cover.addRows(coverRows);
  cover.getRow(1).font = { bold: true };

  const documentRows = input.documents.flatMap((document) => {
    const revisions = [
      { ...document.current, register: "Current" },
      ...document.history.map((revision) => ({ ...revision, register: "History" })),
    ];
    return revisions.map((revision) => ({
      documentNumber: document.documentNumber,
      title: document.title,
      documentType: document.documentType,
      owner: document.owner,
      revision: revision.revision,
      register: revision.register,
      status: revision.status,
      approver: revision.approver,
      signature: revision.signature ? formatSignature(revision.signature) : "",
      approvedOn: revision.approvedOn,
      effectiveOn: revision.effectiveOn,
      retiredOn: revision.retiredOn,
      file: yesNo(revision.fileName),
    }));
  });
  addSheet(workbook, "Documents", [
    { header: "Document number", key: "documentNumber", width: 20 },
    { header: "Title", key: "title", width: 36 },
    { header: "Type", key: "documentType", width: 20 },
    { header: "Owner", key: "owner", width: 22 },
    { header: "Revision", key: "revision", width: 12 },
    { header: "Register", key: "register", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Approver", key: "approver", width: 22 },
    { header: "Signature", key: "signature", width: 42 },
    { header: "Approved", key: "approvedOn", width: 14 },
    { header: "Effective", key: "effectiveOn", width: 14 },
    { header: "Retired", key: "retiredOn", width: 14 },
    { header: "File attached", key: "file", width: 14 },
  ], documentRows);

  const trainingRows = [...input.training]
    .map((record) => ({ record, status: trainingStatus(record, trainingDocuments) }))
    .sort((a, b) => (a.status === "Retraining due" ? 0 : 1) - (b.status === "Retraining due" ? 0 : 1))
    .map(({ record, status }) => ({
      personName: record.personName,
      role: record.role,
      trainer: record.trainer,
      trainedOn: record.trainedOn,
      documentNumber: record.documentNumber,
      documentTitle: record.documentTitle,
      revision: record.revision,
      status,
      file: yesNo(record.fileName),
    }));
  addSheet(workbook, "Training", [
    { header: "Person", key: "personName", width: 24 },
    { header: "Role", key: "role", width: 24 },
    { header: "Trainer", key: "trainer", width: 24 },
    { header: "Date trained", key: "trainedOn", width: 14 },
    { header: "Document number", key: "documentNumber", width: 20 },
    { header: "Document", key: "documentTitle", width: 36 },
    { header: "Revision", key: "revision", width: 12 },
    { header: "Status", key: "status", width: 18 },
    { header: "Signed sheet", key: "file", width: 14 },
  ], trainingRows);

  const eventRank = { Overdue: 0, Open: 1, Closed: 2 };
  const eventRows = [...input.events]
    .sort((a, b) => eventRank[eventStatus(a, input.preparedOn)] - eventRank[eventStatus(b, input.preparedOn)])
    .map((record) => ({
      number: record.number,
      kind: record.kind,
      title: record.title,
      openedOn: record.openedOn,
      reportedBy: record.reportedBy,
      source: record.source,
      productOrProcess: record.productOrProcess,
      capaNumber: record.capaNumber,
      owner: record.owner,
      dueOn: record.dueOn,
      status: eventStatus(record, input.preparedOn),
      closedOn: record.closedOn,
      signatures: signatureList(record.signatures).map(formatSignature).join(" | "),
      containment: record.containment,
      rootCause: record.rootCause,
      correctiveAction: record.correctiveAction,
      preventiveAction: record.preventiveAction,
      verification: record.verification,
      file: yesNo(record.fileName),
    }));
  addSheet(workbook, "Complaints and CAPA", [
    { header: "Number", key: "number", width: 16 },
    { header: "Type", key: "kind", width: 14 },
    { header: "Title", key: "title", width: 36 },
    { header: "Opened", key: "openedOn", width: 14 },
    { header: "Reported by", key: "reportedBy", width: 22 },
    { header: "Source", key: "source", width: 18 },
    { header: "Product or process", key: "productOrProcess", width: 24 },
    { header: "CAPA", key: "capaNumber", width: 16 },
    { header: "Owner", key: "owner", width: 22 },
    { header: "Target", key: "dueOn", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Closed", key: "closedOn", width: 14 },
    { header: "Closure signature", key: "signatures", width: 42 },
    { header: "Containment", key: "containment", width: 36 },
    { header: "Root cause", key: "rootCause", width: 36 },
    { header: "Corrective action", key: "correctiveAction", width: 36 },
    { header: "Preventive action", key: "preventiveAction", width: 36 },
    { header: "Verification", key: "verification", width: 36 },
    { header: "Evidence attached", key: "file", width: 18 },
  ], eventRows);

  const supplierRank = { Expired: 0, "Expiring soon": 1, Suspended: 2, Conditional: 3, Current: 4 };
  const supplierRows = [...input.suppliers]
    .sort((a, b) => supplierRank[certificateStatus(a, input.preparedOn)] - supplierRank[certificateStatus(b, input.preparedOn)])
    .map((record) => ({
      supplierName: record.supplierName,
      suppliedItem: record.suppliedItem,
      approval: record.approval,
      approvedOn: record.approvedOn,
      approvedBy: record.approvedBy,
      signatures: signatureList(record.signatures).map(formatSignature).join(" | "),
      certificateName: record.certificateName,
      certificateNumber: record.certificateNumber,
      expiresOn: record.expiresOn,
      leadDays: record.leadDays,
      status: certificateStatus(record, input.preparedOn),
      file: yesNo(record.fileName),
    }));
  addSheet(workbook, "Approved suppliers", [
    { header: "Supplier", key: "supplierName", width: 28 },
    { header: "Approved to supply", key: "suppliedItem", width: 28 },
    { header: "Approval", key: "approval", width: 14 },
    { header: "Approved", key: "approvedOn", width: 14 },
    { header: "Approved by", key: "approvedBy", width: 22 },
    { header: "Signature", key: "signatures", width: 42 },
    { header: "Certificate", key: "certificateName", width: 24 },
    { header: "Certificate number", key: "certificateNumber", width: 22 },
    { header: "Expires", key: "expiresOn", width: 14 },
    { header: "Alert days", key: "leadDays", width: 12 },
    { header: "Status", key: "status", width: 16 },
    { header: "File attached", key: "file", width: 14 },
  ], supplierRows);

  if (input.licenses) {
    addSheet(workbook, "License vault", [
      { header: "Company", key: "company", width: 28 },
      { header: "Document", key: "documentName", width: 36 },
      { header: "Type", key: "documentType", width: 18 },
      { header: "Jurisdiction", key: "jurisdiction", width: 24 },
      { header: "Reference", key: "licenseNumber", width: 22 },
      { header: "Expires", key: "expiresOn", width: 16 },
      { header: "Alert days", key: "renewalLeadDays", width: 14 },
      { header: "Status", key: "status", width: 18 },
      { header: "File attached", key: "file", width: 14 },
    ], input.licenses.map((record) => ({
      company: record.company,
      documentName: record.documentName,
      documentType: record.documentType,
      jurisdiction: record.jurisdiction,
      licenseNumber: record.licenseNumber,
      expiresOn: record.expiresOn,
      renewalLeadDays: record.renewalLeadDays,
      status: record.status,
      file: yesNo(record.fileName),
    })));
  }

  if (input.supplierRisk) {
    addSheet(workbook, "Supplier risk", [
      { header: "Supplier", key: "name", width: 28 },
      { header: "Category", key: "category", width: 22 },
      { header: "Risk score", key: "score", width: 14 },
      { header: "Trend", key: "trend", width: 12 },
      { header: "Note", key: "note", width: 44 },
    ], input.supplierRisk.map((record) => ({
      name: record.name,
      category: record.category,
      score: record.score,
      trend: record.trend,
      note: record.note,
    })));
  }

  const auditRows = input.auditEvents.flatMap((event) => {
    const base = {
      at: formatUtc(event.at),
      person: event.printedName,
      email: event.email,
      actor: event.actorEmail ? `${event.actorName} (${event.actorEmail})` : "",
      action: event.action,
      meaning: event.meaning,
      recordType: event.recordType,
      record: event.recordLabel,
    };
    if (event.changes.length === 0) return [{ ...base, field: "", before: "", after: "" }];
    return event.changes.map((change) => ({ ...base, field: change.field, before: change.before, after: change.after }));
  });
  addSheet(workbook, "Audit trail", [
    { header: "Time UTC", key: "at", width: 24 },
    { header: "Person", key: "person", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Administrator session", key: "actor", width: 32 },
    { header: "Action", key: "action", width: 12 },
    { header: "Meaning", key: "meaning", width: 14 },
    { header: "Record type", key: "recordType", width: 14 },
    { header: "Record", key: "record", width: 32 },
    { header: "Field", key: "field", width: 22 },
    { header: "Previous value", key: "before", width: 36 },
    { header: "New value", key: "after", width: 36 },
  ], auditRows);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
