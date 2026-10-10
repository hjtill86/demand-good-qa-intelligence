import type { RecordSignature } from "./part11-records";

export const part11Protocol = {
  revision: "1",
  dated: "2026-10-10",
  tests: [
    { id: "IQ-1", step: "Open a register without signing in.", expected: "The register does not open." },
    { id: "OQ-1", step: "Approve a draft document with the password for the signed-in account.", expected: "The revision shows the signer’s printed name, the meaning approval, and a UTC time. The audit trail has the same signature." },
    { id: "OQ-2", step: "Approve a draft with the wrong password.", expected: "The revision stays a draft. No approval entry is kept." },
    { id: "OQ-3", step: "Delete an approved or retired document.", expected: "The register refuses, and the revision is still there." },
    { id: "OQ-4", step: "Close a CAPA with the account password, then reopen it and try to delete it.", expected: "The closure signature remains. Delete is refused." },
    { id: "OQ-5", step: "Change a field on an open CAPA or a training record.", expected: "The audit trail shows the person, the UTC time, the previous value, and the new value." },
    { id: "OQ-6", step: "Mark a supplier file Approved with the account password, then try to delete it.", expected: "The file shows the approval signature and stays on the register." },
    { id: "OQ-7", step: "Download the auditor packet.", expected: "The workbook has an Audit trail sheet." },
    { id: "PQ-1", step: "Take one document from draft through approval, a new revision, and the auditor packet.", expected: "The retired revision is still listed, and the trail matches what was done." },
  ],
} as const;

export type ValidationTestResult = "" | "Pass" | "Fail";

export type ValidationTestRecord = {
  id: string;
  result: ValidationTestResult;
  notes: string;
  recordedBy: string;
  recordedAt: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
};

export type ValidationPackage = {
  id: string;
  protocolRevision: string;
  protocolDated: string;
  tests: ValidationTestRecord[];
  signature?: RecordSignature;
};

export function blankValidationTest(id: string): ValidationTestRecord {
  return { id, result: "", notes: "", recordedBy: "", recordedAt: "" };
}

export function validationReadyToSign(pkg: ValidationPackage) {
  return part11Protocol.tests.every((spec) => {
    const test = pkg.tests.find((item) => item.id === spec.id);
    return test?.result === "Pass" && test.notes.trim().length > 0;
  });
}
