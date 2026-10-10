import { currentUser } from "@clerk/nextjs/server";
import { getDgqiPlan } from "../../../lib/dgqi-entitlements";
import { part11Protocol } from "../../../lib/part11-protocol";
import { listValidationPackages } from "../../../lib/part11-validation";
import { ValidationRunner } from "./validation-runner";

export const dynamic = "force-dynamic";

export default async function Part11PackagePage() {
  const user = await currentUser();
  const hasMostGood = getDgqiPlan(user) === "most-good";
  const stored = hasMostGood ? await listValidationPackages() : null;
  const signed = stored?.ok
    ? stored.packages.some((pkg) => pkg.protocolRevision === part11Protocol.revision && pkg.signature)
    : false;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">VALIDATION PACKAGE · REVISION {part11Protocol.revision} · {part11Protocol.dated}</span>
        <h1>Part 11 validation</h1>
        <p className="fine-print">
          {hasMostGood
            ? signed
              ? "This account has a signed validation for the current revision. That copy stays on the account."
              : "Most Good stores the results, the files, and the signature for this revision on the account."
            : "Running and signing this validation is included with Most Good."}
          {" "}A signed package is this account’s record that these tests were run. It does not by itself make every record Part 11 compliant.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>

      <section className="report-section">
        <h2>1. Intended use</h2>
        <p>
          Subscribers use the workspace to keep controlled documents, training records, complaints and
          CAPAs, and approved supplier files. A person signs an approval or a CAPA closure by entering
          the password for the account that is already signed in.
        </p>
      </section>

      <section className="report-section">
        <h2>2. What this revision includes</h2>
        <ul className="wi-steps">
          <li>Each create, change, deletion, and signature writes a new audit entry. Older entries are not overwritten.</li>
          <li>Document approval, CAPA closure, and a new supplier approval require the signed-in account’s password.</li>
          <li>Approved and retired document revisions, closed CAPAs, and approved supplier files stay on the register.</li>
          <li>The auditor packet includes an Audit trail sheet.</li>
        </ul>
      </section>

      <section className="report-section">
        <h2>3. Outside this validation</h2>
        <ul className="wi-steps">
          <li>The review board, CAPA worksheet, audit-readiness pack, SPC / MSA tools, and the Validation suite worksheet are not this record.</li>
          <li>Any signed-in member of the account can run and sign the tests. There is no separate approver role.</li>
          <li>Password expiry and multi-factor authentication are settings in Clerk.</li>
        </ul>
      </section>

      {hasMostGood && stored ? (
        <ValidationRunner initialPackages={stored.ok ? stored.packages : []} storageError={stored.ok ? undefined : stored.error} />
      ) : (
        <section className="report-section">
          <h2>4. Tests in revision {part11Protocol.revision}</h2>
          <ul className="wi-steps">
            {part11Protocol.tests.map((test) => (
              <li key={test.id}><b>{test.id}.</b> {test.step} Expected: {test.expected}</li>
            ))}
          </ul>
          <p>Most Good saves each result, what you saw, an optional file, and a password signature. The signed revision stays on the account.</p>
          <a className="button button-dark" href="/checkout?plan=most-good">Upgrade to Most Good <span>→</span></a>
        </section>
      )}

      <section className="report-section">
        <h2>5. Change control</h2>
        <p>
          Revision {part11Protocol.revision} matches the release dated {part11Protocol.dated}. A later change to these
          controls opens a new revision. The signed copy of this revision stays on the account.
        </p>
        <p className="fine-print">
          See the live entries on the <a href="/dashboard/audit-trail">audit trail</a>.
        </p>
      </section>
    </main>
  );
}
