import { NextResponse } from "next/server";
import { readValidationEvidence, saveValidationEvidence } from "../../../../lib/part11-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await readValidationEvidence(url.searchParams.get("packageId") ?? "", url.searchParams.get("testId") ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const filename = result.fileName.replace(/["\r\n]/g, "");
  return new NextResponse(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": result.fileType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const packageId = form?.get("packageId");
  const testId = form?.get("testId");
  const file = form?.get("file");
  if (typeof packageId !== "string" || typeof testId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "A validation, a test, and a file are required." }, { status: 400 });
  }
  const result = await saveValidationEvidence(packageId, testId, file);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ package: result.package });
}
