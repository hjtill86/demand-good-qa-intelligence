import { NextResponse } from "next/server";
import { isQmsTool, readQmsState, sanitizeQmsPayload, writeQmsState } from "../../../../lib/qms-state";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ tool: string }> }) {
  const { tool } = await context.params;
  if (!isQmsTool(tool)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(await readQmsState(tool));
}

export async function PUT(request: Request, context: { params: Promise<{ tool: string }> }) {
  const { tool } = await context.params;
  if (!isQmsTool(tool)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const payload = sanitizeQmsPayload(tool, await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "A saved workspace object is required." }, { status: 400 });
  const result = await writeQmsState(tool, payload);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ saved: true });
}
