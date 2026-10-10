import { NextResponse } from "next/server";
import { createSupplierFile, listSupplierFiles } from "../../../lib/supplier-files";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listSupplierFiles();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ records: result.records });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createSupplierFile(body ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ record: result.record }, { status: result.status });
}
