import { NextResponse } from "next/server";
import { stampConfidentialCopy } from "../../../../lib/confidential-stamp";
import { issuingOrganizationName } from "../../../../lib/issuing-organization";
import { readDocumentFile, saveDocumentFile } from "../../../../lib/controlled-documents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await readDocumentFile(url.searchParams.get("id") ?? "", url.searchParams.get("revision") ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const stamped = await stampConfidentialCopy({
    bytes: result.bytes,
    fileType: result.fileType,
    documentNumber: result.documentNumber,
    revision: result.revision,
    status: result.revisionStatus,
    effectiveOn: result.effectiveOn,
    retiredOn: result.retiredOn,
    organizationName: await issuingOrganizationName(),
  });
  const filename = result.fileName.replace(/["\r\n]/g, "");
  return new NextResponse(new Uint8Array(stamped.bytes), {
    headers: {
      "Content-Type": stamped.fileType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const id = form?.get("id");
  const file = form?.get("file");
  if (typeof id !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "A document and file are required." }, { status: 400 });
  }
  const result = await saveDocumentFile(id, file);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ document: result.document });
}
