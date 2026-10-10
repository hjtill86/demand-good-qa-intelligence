import { listControlledDocuments } from "../../../lib/controlled-documents";
import { DocumentRegister } from "./document-register";

export default async function DocumentsPage() {
  const result = await listControlledDocuments();
  const documents = result.ok ? result.documents : [];

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Controlled documents</h1>
        <p className="fine-print">
          Keep the current SOP, work instruction, policy, or form, who approved it, and every retired revision.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <DocumentRegister initialDocuments={documents} storageError={result.ok ? undefined : result.error} />
    </main>
  );
}
