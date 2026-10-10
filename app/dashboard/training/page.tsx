import { listControlledDocuments } from "../../../lib/controlled-documents";
import { listTrainingRecords } from "../../../lib/training-records";
import { TrainingRegister, type TrainingDocumentOption } from "./training-register";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const [recordsResult, documentsResult] = await Promise.all([
    listTrainingRecords(),
    listControlledDocuments(),
  ]);
  const records = recordsResult.ok ? recordsResult.records : [];
  const documents: TrainingDocumentOption[] = documentsResult.ok
    ? documentsResult.documents.map((document) => ({
      id: document.id,
      documentNumber: document.documentNumber,
      title: document.title,
      currentRevisionId: document.current.id,
      revisions: [
        { id: document.current.id, revision: document.current.revision, status: document.current.status },
        ...document.history.map((revision) => ({
          id: revision.id,
          revision: revision.revision,
          status: revision.status,
        })),
      ],
    }))
    : [];
  const storageError = !recordsResult.ok ? recordsResult.error : !documentsResult.ok ? documentsResult.error : undefined;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Training records</h1>
        <p className="fine-print">
          Record who was trained on a document revision and keep the signed sheet with that revision.
          When the document moves to a new revision, the earlier training stays and shows as due for retraining.
          The person does not need a login.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <TrainingRegister initialRecords={records} documents={documents} storageError={storageError} />
    </main>
  );
}
