export type TrainingStatus = "Current" | "Retraining due" | "Document removed";

export function trainingStatus(
  record: { documentId: string; revisionId: string },
  documents: { id: string; currentRevisionId: string }[],
): TrainingStatus {
  const document = documents.find((item) => item.id === record.documentId);
  if (!document) return "Document removed";
  if (document.currentRevisionId !== record.revisionId) return "Retraining due";
  return "Current";
}
