import { NextResponse } from "next/server";
import { createControlledDocument, listControlledDocuments } from "../../../lib/controlled-documents";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listControlledDocuments();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ documents: result.documents });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createControlledDocument(body ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ document: result.document }, { status: result.status });
}
