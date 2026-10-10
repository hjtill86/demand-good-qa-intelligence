import { listControlledDocuments } from "../../../lib/controlled-documents";
import { issuingOrganizationName } from "../../../lib/issuing-organization";
import { DocumentRegister } from "./document-register";

export default async function DocumentsPage() {
  const result = await listControlledDocuments();
  const documents = result.ok ? result.documents : [];
  const organizationName = await issuingOrganizationName();

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Controlled documents</h1>
        <p className="fine-print">
          Keep the current SOP, work instruction, policy, or form, who approved it, and every retired revision.
          Each downloaded file adds the confidential statement at the bottom.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <DocumentRegister
        initialDocuments={documents}
        organizationName={organizationName}
        storageError={result.ok ? undefined : result.error}
      />
    </main>
  );
}
