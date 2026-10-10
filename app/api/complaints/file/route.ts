import { NextResponse } from "next/server";
import { readEventFile, removeEventFile, saveEventFile } from "../../../../lib/quality-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await readEventFile(new URL(request.url).searchParams.get("id") ?? "");
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
  const id = form?.get("id");
  const file = form?.get("file");
  if (typeof id !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "A complaint or deviation and a file are required." }, { status: 400 });
  }
  const result = await saveEventFile(id, file);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ record: result.record });
}

export async function DELETE(request: Request) {
  const result = await removeEventFile(new URL(request.url).searchParams.get("id") ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ record: result.record });
}
