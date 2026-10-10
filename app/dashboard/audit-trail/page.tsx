import { listAuditEvents } from "../../../lib/audit-trail";
import { formatUtc } from "../../../lib/part11-records";

export const dynamic = "force-dynamic";

export default async function AuditTrailPage() {
  const result = await listAuditEvents();
  const events = result.ok ? result.events : [];

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Audit trail</h1>
        <p className="fine-print">
          The system adds an entry when someone creates, changes, deletes, or signs a controlled document,
          training record, complaint, CAPA, or supplier file. Entries are not edited. Times are UTC.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <section className="report-section">
        {result.ok ? null : <p className="fine-print" role="status">{result.error}</p>}
        {result.ok && result.truncated ? (
          <p className="fine-print">Showing the latest 100 entries. Older entries remain stored and are included up to that limit in the auditor packet.</p>
        ) : null}
        {events.length === 0 ? (
          <p className="fine-print">No record changes yet. Approving a document, closing a CAPA, or editing a register adds an entry here.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Time UTC</th>
                <th>Person</th>
                <th>Action</th>
                <th>Record</th>
                <th>Field</th>
                <th>Previous</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {events.flatMap((event) => {
                const changes = event.changes.length ? event.changes : [{ field: "", before: "", after: "" }];
                return changes.map((change, index) => (
                  <tr key={`${event.id}-${change.field}-${index}`}>
                    <td>{index === 0 ? formatUtc(event.at) : ""}</td>
                    <td>
                      {index === 0 ? (
                        <>
                          {event.printedName}
                          {event.email ? <><br />{event.email}</> : null}
                          {event.actorEmail ? <><br />Administrator session: {event.actorName} ({event.actorEmail})</> : null}
                          {event.meaning ? <><br />Meaning: {event.meaning}</> : null}
                        </>
                      ) : ""}
                    </td>
                    <td>{index === 0 ? event.action : ""}</td>
                    <td>{index === 0 ? `${event.recordType}: ${event.recordLabel}` : ""}</td>
                    <td>{change.field}</td>
                    <td>{change.before}</td>
                    <td>{change.after}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
        <p className="fine-print">
          The same entries are on the Audit trail sheet of the <a href="/dashboard/audit-packet">auditor packet</a>.
          The written tests for these controls are in the <a href="/dashboard/part-11">Part 11 package</a>.
        </p>
      </section>
    </main>
  );
}
