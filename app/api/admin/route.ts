import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/admin-access";
import { setAccountPlan, setLoginPack } from "../../../lib/admin-accounts";
import type { StripePlanKey } from "../../../lib/integration-config";
import { removeSharedLogin } from "../../../lib/team-seats";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const fields = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const action = text(fields.action);
  const userId = text(fields.userId);
  if (!userId) return NextResponse.json({ error: "Choose an account." }, { status: 400 });

  const plan = text(fields.plan);
  if (action === "set-plan" && plan !== "foundation" && plan !== "most-good") {
    return NextResponse.json({ error: "Choose Foundation or Most Good." }, { status: 400 });
  }

  const result = action === "set-plan"
    ? await setAccountPlan(userId, plan as StripePlanKey)
    : action === "set-login-pack"
      ? await setLoginPack(userId, fields.active === true)
      : action === "remove-seat"
        ? await removeSharedLogin(userId, text(fields.email))
        : { ok: false as const, error: "Choose a plan, login pack, or login removal.", status: 400 as const };
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  console.info("Admin account change.", { admin: access.email, action, userId });
  return NextResponse.json({ ok: true });
}
