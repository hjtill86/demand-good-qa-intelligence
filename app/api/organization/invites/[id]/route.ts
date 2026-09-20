import { NextResponse } from "next/server";
import { getDataScope } from "../../../../../lib/supabase-server";
import { revokeInvite } from "../../../../../lib/organization-invites";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "An invitation id is required." }, { status: 400 });
  }

  const { error } = await revokeInvite(scope.organizationId, id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ revoked: true });
}
