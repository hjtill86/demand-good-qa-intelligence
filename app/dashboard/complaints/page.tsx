import { listQualityEvents } from "../../../lib/quality-events";
import { ComplaintRegister } from "./complaint-register";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  const result = await listQualityEvents();
  const records = result.ok ? result.records : [];
  const storageError = result.ok ? undefined : result.error;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Complaints and deviations</h1>
        <p className="fine-print">
          Record a customer complaint or an internal deviation. Saving it opens a CAPA on the same record.
          The CAPA stays open until the root cause, corrective action, and a way to verify it are recorded.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <ComplaintRegister initialRecords={records} storageError={storageError} />
    </main>
  );
}
