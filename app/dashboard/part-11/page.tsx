export const dynamic = "force-dynamic";

const tests = [
  ["IQ-1", "Open a register without signing in.", "The register does not open."],
  ["OQ-1", "Approve a draft document with the password for the signed-in account.", "The revision shows the signer’s printed name, the meaning approval, and a UTC time. The audit trail has the same signature."],
  ["OQ-2", "Approve a draft with the wrong password.", "The revision stays a draft. No approval entry is kept."],
  ["OQ-3", "Delete an approved or retired document.", "The register refuses, and the revision is still there."],
  ["OQ-4", "Close a CAPA with the account password, then reopen it and try to delete it.", "The closure signature remains. Delete is refused."],
  ["OQ-5", "Change a field on an open CAPA or a training record.", "The audit trail shows the person, the UTC time, the previous value, and the new value."],
  ["OQ-6", "Mark a supplier file Approved with the account password, then try to delete it.", "The file shows the approval signature and stays on the register."],
  ["OQ-7", "Download the auditor packet.", "The workbook has an Audit trail sheet."],
  ["PQ-1", "Take one document from draft through approval, a new revision, and the auditor packet.", "The retired revision is still listed, and the trail matches what was done."],
];

export default function Part11PackagePage() {
  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">VALIDATION PACKAGE · REVISION 1 · 2026-10-10</span>
        <h1>Part 11 controls</h1>
        <p className="fine-print">
          This page describes the electronic-record controls in Demand Good QA Intelligence and the tests
          still to be run. It is not a completed validation and it is not a claim that the system is
          21 CFR Part 11 compliant.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>

      <section className="report-section">
        <h2>1. Intended use</h2>
        <p>
          Subscribers use the workspace to keep controlled documents, training records, complaints and
          CAPAs, and approved supplier files. Those four registers are the records this package covers.
          A person signs an approval or a CAPA closure by entering the password for the account that is
          already signed in. The system records that person’s name, the meaning of the signature, and
          the UTC time on the record and in the audit trail.
        </p>
      </section>

      <section className="report-section">
        <h2>2. What this revision includes</h2>
        <ul className="wi-steps">
          <li>Each create, change, deletion, and signature writes a new audit entry. Older entries are not overwritten.</li>
          <li>The entry stores the person, the email, the UTC time, the record, the previous value, and the new value.</li>
          <li>If Clerk identifies an administrator session acting as the user, that administrator is named on the entry.</li>
          <li>Document approval, CAPA closure, and a new supplier approval require the signed-in account’s password. A wrong password does not change the record.</li>
          <li>The signature stores the printed name, the email, the meaning (approval or closure), and the UTC time on the record itself.</li>
          <li>Approved and retired document revisions cannot be deleted. A CAPA that has been closed cannot be deleted, including after it is reopened. A supplier file that has been approved cannot be deleted.</li>
          <li>The auditor packet includes an Audit trail sheet for copying during an inspection.</li>
        </ul>
      </section>

      <section className="report-section">
        <h2>3. Outside this package</h2>
        <ul className="wi-steps">
          <li>The review board, CAPA worksheet, audit-readiness pack, and SPC / MSA tools are working papers. They are not the system of record for a complaint or a controlled document.</li>
          <li>License vault files, supplier risk scores, the regulatory feed, and the public website are outside this record set.</li>
          <li>There is no separate approver role. Any signed-in member of the account can sign.</li>
          <li>Password length, expiry, and multi-factor authentication are settings in Clerk. This package does not record which of those settings are turned on.</li>
          <li>The test workspace can be reset. That reset removes the test account’s records and its audit trail. It does not reset a customer account.</li>
          <li>These tests have not been executed, and no quality-unit signature is on this revision.</li>
        </ul>
      </section>

      <section className="report-section">
        <h2>4. Tests to run</h2>
        <p>Run these on the production site with a real account password. Write the result, initials, and date on the printed copy. Leave the result blank until the test is done.</p>
        <table className="report-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Step</th>
              <th>Expected result</th>
              <th>Result</th>
              <th>Initials</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {tests.map(([id, step, expected]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{step}</td>
                <td>{expected}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>5. Change control</h2>
        <p>
          Revision 1 matches the release that added the audit trail, password signatures, and the delete
          limits above. A later change to those controls needs a new revision of this page, a note of
          what changed, and the tests run again before the records are treated as validated.
        </p>
        <p className="fine-print">
          See the live entries on the <a href="/dashboard/audit-trail">audit trail</a>.
        </p>
      </section>
    </main>
  );
}
