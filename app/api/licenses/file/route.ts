import { NextResponse } from "next/server";
import { readLicenseFile, removeLicenseFile, saveLicenseFile } from "../../../../lib/license-files";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const result = await readLicenseFile(id);
  if (!("bytes" in result)) return NextResponse.json({ error: result.error }, { status: result.status });
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
  const id = form?.get("id");
  const file = form?.get("file");
  if (typeof id !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "A license record and file are required." }, { status: 400 });
  }
  const result = await saveLicenseFile(id, file);
  if (!("fileName" in result)) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ saved: true, fileName: result.fileName });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const result = await removeLicenseFile(id);
  if (!("status" in result) || result.error) return NextResponse.json({ error: result.error ?? "Could not remove the file." }, { status: result.status });
  return NextResponse.json({ deleted: true });
}
