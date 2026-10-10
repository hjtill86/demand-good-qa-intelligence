import { NextResponse } from "next/server";
import { approveDocument, deleteControlledDocument, retireDocument, startNextRevision } from "../../../../lib/controlled-documents";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const payload = body && typeof body === "object" ? body as { action?: unknown; approver?: unknown; effectiveOn?: unknown; revision?: unknown } : {};
  const action = payload.action;
  const result = action === "approve"
    ? await approveDocument(id, payload)
    : action === "revise"
      ? await startNextRevision(id, payload)
      : action === "retire"
        ? await retireDocument(id)
        : { ok: false as const, error: "Choose approve, revise, or retire.", status: 400 as const };
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ document: result.document });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteControlledDocument(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
}
