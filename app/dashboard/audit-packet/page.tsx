import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { listControlledDocuments } from "../../../lib/controlled-documents";
import { getDgqiPlan } from "../../../lib/dgqi-entitlements";
import { eventStatus } from "../../../lib/event-status";
import { listQualityEvents } from "../../../lib/quality-events";
import { certificateStatus } from "../../../lib/supplier-status";
import { listSupplierFiles } from "../../../lib/supplier-files";
import { listTrainingRecords } from "../../../lib/training-records";
import { trainingStatus } from "../../../lib/training-status";

export const dynamic = "force-dynamic";

export default async function AuditPacketPage() {
  const [documents, training, events, suppliers] = await Promise.all([
    listControlledDocuments(),
    listTrainingRecords(),
    listQualityEvents(),
    listSupplierFiles(),
  ]);
  const failure = [documents, training, events, suppliers].find((result) => !result.ok);
  const ready = documents.ok && training.ok && events.ok && suppliers.ok;
  const today = new Date().toISOString().slice(0, 10);
  const hasMostGood = isClerkConfigured() && getDgqiPlan(await currentUser().catch(() => null)) === "most-good";
  const documentCount = documents.ok ? documents.documents.length : 0;
  const trainingCount = training.ok ? training.records.length : 0;
  const retrainingDue = documents.ok && training.ok
    ? training.records.filter((record) => trainingStatus(record, documents.documents.map((document) => ({
      id: document.id,
      currentRevisionId: document.current.id,
    }))) === "Retraining due").length
    : 0;
  const eventCount = events.ok ? events.records.length : 0;
  const overdue = events.ok ? events.records.filter((record) => eventStatus(record, today) === "Overdue").length : 0;
  const supplierCount = suppliers.ok ? suppliers.records.length : 0;
  const supplierAttention = suppliers.ok
    ? suppliers.records.filter((record) => {
      const status = certificateStatus(record, today);
      return status === "Expired" || status === "Expiring soon";
    }).length
    : 0;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Auditor packet</h1>
        <p className="fine-print">
          Download one workbook of the document register, training records, complaints and CAPAs, and approved suppliers.
          {hasMostGood ? " Most Good also includes the license vault and supplier risk scores." : ""}
          {" "}The packet is a snapshot of those registers on the day you download it.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <section className="report-section">
        <h2>Included on {today}</h2>
        <ul className="wi-steps">
          <li>{documentCount} controlled {documentCount === 1 ? "document" : "documents"}, including retired revisions.</li>
          <li>{trainingCount} training {trainingCount === 1 ? "record" : "records"}{retrainingDue > 0 ? `, ${retrainingDue} due for retraining` : ""}.</li>
          <li>{eventCount} {eventCount === 1 ? "complaint or deviation" : "complaints and deviations"}{overdue > 0 ? `, ${overdue} past the CAPA target date` : ""}.</li>
          <li>{supplierCount} approved supplier {supplierCount === 1 ? "file" : "files"}{supplierAttention > 0 ? `, ${supplierAttention} expired or inside the alert window` : ""}.</li>
          {hasMostGood ? <li>License vault and supplier risk scores.</li> : null}
          <li>The latest audit trail entries, with the previous value and the new value.</li>
          {hasMostGood ? <li>The Part 11 validation results saved on this account.</li> : null}
        </ul>
        <p className="fine-print">
          The workbook lists each record and whether a file is attached. Open the record in the workspace to download the file itself.
        </p>
        {ready ? (
          <a className="button button-dark" href="/api/audit-packet">Download auditor packet</a>
        ) : (
          <p className="fine-print" role="status">{failure && !failure.ok ? failure.error : "The packet could not be prepared."}</p>
        )}
      </section>
    </main>
  );
}
