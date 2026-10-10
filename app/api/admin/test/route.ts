import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-access";
import { openTestWorkspace, resetTestWorkspace } from "../../../../lib/test-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const action = body && typeof body === "object" && "action" in body ? String(body.action) : "";
  if (action === "open") {
    const result = await openTestWorkspace(access.userId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    console.info("Admin opened the test workspace.", { admin: access.email });
    return NextResponse.json({ url: result.url });
  }
  if (action === "reset") {
    const result = await resetTestWorkspace();
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    console.info("Admin reset the test workspace.", { admin: access.email, storageCleared: result.storageCleared });
    return NextResponse.json({ ok: true, storageCleared: result.storageCleared });
  }
  return NextResponse.json({ error: "Choose open or reset." }, { status: 400 });
}
