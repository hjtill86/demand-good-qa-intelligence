import { NextResponse } from "next/server";
import { createTrainingRecord, listTrainingRecords } from "../../../lib/training-records";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listTrainingRecords();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ records: result.records });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createTrainingRecord(body ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ record: result.record }, { status: result.status });
}
