import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDataScope } from "../../../../lib/supabase-server";
import {
  createInvite,
  isValidEmail,
  listPendingInvites,
  normalizeEmail,
  sendInviteEmail,
  type InviteRole,
} from "../../../../lib/organization-invites";

export async function GET() {
  const scope = await getDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await listPendingInvites(scope.organizationId);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ invites: data });
}

export async function POST(request: Request) {
  const scope = await getDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; role?: unknown }
    | null;

  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const role: InviteRole = body?.role === "admin" ? "admin" : "member";

  const user = await currentUser();
  const invitedByName =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || null;

  const { data, error } = await createInvite({
    organizationId: scope.organizationId,
    email,
    role,
    invitedBy: scope.userId,
    invitedByName,
  });

  if (error || !data) {
    return NextResponse.json({ error: error ?? "Could not create the invitation." }, { status: 500 });
  }

  try {
    await sendInviteEmail(data);
  } catch (sendError) {
    return NextResponse.json(
      {
        invite: data,
        warning:
          sendError instanceof Error
            ? sendError.message
            : "The invitation was created but the email could not be sent.",
      },
      { status: 201 },
    );
  }

  return NextResponse.json({ invite: data }, { status: 201 });
}
