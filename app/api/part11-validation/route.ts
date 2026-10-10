import { NextResponse } from "next/server";
import { recordValidationTest, signValidationPackage, startValidationPackage } from "../../../lib/part11-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = body && typeof body === "object" ? body as { action?: unknown; packageId?: unknown; testId?: unknown; result?: unknown; notes?: unknown; password?: unknown } : {};
  const action = payload.action;
  const result = action === "start"
    ? await startValidationPackage()
    : action === "record" && typeof payload.packageId === "string" && typeof payload.testId === "string"
      ? await recordValidationTest(payload.packageId, payload.testId, payload)
      : action === "sign" && typeof payload.packageId === "string"
        ? await signValidationPackage(payload.packageId, payload.password)
        : { ok: false as const, error: "Choose start, record, or sign.", status: 400 as const };
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ package: result.package });
}
