import { NextResponse } from "next/server";
import { deleteTrainingRecord } from "../../../../lib/training-records";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteTrainingRecord(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
}
