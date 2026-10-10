import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { addTeamLogin, removeTeamLogin } from "../../../lib/team-seats";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isClerkConfigured()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const result = await addTeamLogin(userId, typeof body?.email === "string" ? body.email : "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ seats: result.seats, used: result.used, limit: result.limit });
}

export async function DELETE(request: Request) {
  if (!isClerkConfigured()) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const result = await removeTeamLogin(userId, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ seats: result.seats, used: result.used, limit: result.limit });
}
