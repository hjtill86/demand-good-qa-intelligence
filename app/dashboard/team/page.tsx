import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listPendingInvites } from "../../../lib/organization-invites";
import { InviteManager } from "./invite-manager";

export default async function TeamPage() {
  const { userId, orgId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const organizationId = orgId ?? `user:${userId}`;
  const { data, error } = await listPendingInvites(organizationId);

  const invites = (data ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    created_at: invite.created_at,
    expires_at: invite.expires_at,
  }));

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">WORKSPACE · TEAM</span>
        <h1>Team &amp; invitations</h1>
        <p className="fine-print">
          Invite colleagues to your Demand Good QA workspace and manage pending invitations.
        </p>
      </header>

      {error ? (
        <section className="report-section">
          <p className="fine-print" role="alert" style={{ color: "#b42318" }}>
            {error}
          </p>
        </section>
      ) : (
        <InviteManager initialInvites={invites} />
      )}
    </main>
  );
}
