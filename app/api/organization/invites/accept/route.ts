import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  acceptInvite,
  getInviteByToken,
  isInviteExpired,
  normalizeEmail,
} from "../../../../../lib/organization-invites";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to accept this invitation." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "An invitation token is required." }, { status: 400 });
  }

  const { data: invite, error } = await getInviteByToken(token);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "This invitation could not be found." }, { status: 404 });
  }
  if (invite.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked." }, { status: 410 });
  }
  if (invite.status === "accepted") {
    return NextResponse.json({ error: "This invitation has already been accepted." }, { status: 409 });
  }
  if (isInviteExpired(invite)) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress
    ? normalizeEmail(user.primaryEmailAddress.emailAddress)
    : "";
  if (userEmail && userEmail !== invite.email) {
    return NextResponse.json(
      {
        error: `This invitation was sent to ${invite.email}. Sign in with that email address to accept it.`,
      },
      { status: 403 },
    );
  }

  const { data: accepted, error: acceptError } = await acceptInvite({ token, userId });
  if (acceptError) {
    return NextResponse.json({ error: acceptError }, { status: 500 });
  }
  if (!accepted) {
    return NextResponse.json({ error: "This invitation is no longer available." }, { status: 409 });
  }

  // If the invite targets a real Clerk organization, add the user as a member.
  if (accepted.organization_id.startsWith("org_")) {
    try {
      const client = await clerkClient();
      await client.organizations.createOrganizationMembership({
        organizationId: accepted.organization_id,
        userId,
        role: accepted.role === "admin" ? "org:admin" : "org:member",
      });
    } catch (membershipError) {
      console.error("[v0] Failed to add Clerk organization membership", membershipError);
    }
  }

  return NextResponse.json({ accepted: true });
}
