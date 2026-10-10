export type ConfidentialCopy = {
  documentNumber: string;
  revision: string;
  status: string;
  effectiveOn?: string;
  retiredOn?: string;
  organizationName?: string;
};

export function confidentialLines(copy: ConfidentialCopy) {
  const owner = copy.organizationName?.trim() || "the issuing organization";
  const control = [
    "CONFIDENTIAL",
    copy.documentNumber,
    `Rev ${copy.revision}`,
    copy.status,
    copy.effectiveOn ? `Effective ${copy.effectiveOn}` : "",
    copy.retiredOn ? `Retired ${copy.retiredOn}` : "",
  ].filter(Boolean).join(" | ");
  const notice = `This document is the property of ${owner}. Unauthorized copying or distribution is prohibited.`;
  return { control, notice, full: `${control}. ${notice}` };
}
