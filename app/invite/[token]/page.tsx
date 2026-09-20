import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";
import {
  getInviteByToken,
  isInviteExpired,
  normalizeEmail,
} from "../../../lib/organization-invites";
import { AcceptInvite } from "./accept-invite";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { userId } = await auth();
  const { data: invite } = await getInviteByToken(token);

  let body: React.ReactNode;

  if (!invite || invite.status === "revoked") {
    body = <p className="fine-print">This invitation is no longer valid. Ask your workspace admin to send a new one.</p>;
  } else if (invite.status === "accepted") {
    body = (
      <p className="fine-print">
        This invitation has already been accepted. <Link href="/dashboard">Go to the dashboard →</Link>
      </p>
    );
  } else if (isInviteExpired(invite)) {
    body = <p className="fine-print">This invitation has expired. Ask your workspace admin to send a new one.</p>;
  } else if (!userId) {
    body = (
      <>
        <p className="fine-print">
          You&apos;ve been invited to join as {invite.role === "admin" ? "an admin" : "a member"}. Sign in with{" "}
          <b>{invite.email}</b> to accept.
        </p>
        <Link className="button button-dark" href={`/login?redirect_url=/invite/${token}`}>
          Sign in to continue
        </Link>
      </>
    );
  } else {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress
      ? normalizeEmail(user.primaryEmailAddress.emailAddress)
      : "";

    if (userEmail && userEmail !== invite.email) {
      body = (
        <p className="fine-print">
          This invitation was sent to <b>{invite.email}</b>, but you&apos;re signed in as <b>{userEmail}</b>. Sign in
          with the invited email address to accept.
        </p>
      );
    } else {
      body = (
        <>
          <p className="fine-print">
            You&apos;ve been invited to join as {invite.role === "admin" ? "an admin" : "a member"}. Accept below to get
            started.
          </p>
          <AcceptInvite token={token} />
        </>
      );
    }
  }

  return (
    <main className="report-page">
      <header className="report-header">
        <BrandLogo />
        <span className="eyebrow">WORKSPACE INVITATION</span>
        <h1>Join the workspace</h1>
      </header>
      <section className="report-section">{body}</section>
    </main>
  );
}
