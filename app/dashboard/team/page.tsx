import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { getTeamLogins } from "../../../lib/team-seats";
import { TeamLogins } from "./team-logins";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  if (!userId) redirect("/login");
  const result = await getTeamLogins(userId);
  if (!result.ok) redirect("/checkout?plan=most-good");

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">MOST GOOD</span>
        <h1>Logins</h1>
        <p className="fine-print">
          {result.limit > 5
            ? "This account includes 10 logins: the 5 with Most Good, plus 5 more."
            : "Most Good includes 5 logins, including the subscription holder. You can add 5 more for $500 per month."}
          {" "}Each person signs in with their own email and sees this company&apos;s workspace.
          A training record can name someone without giving them a login.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <section className="report-section">
        <TeamLogins
          ownerEmail={result.ownerEmail}
          initialSeats={result.seats.map((seat) => ({ email: seat.email, pending: !seat.userId }))}
          limit={result.limit}
          extraLogins={result.limit > 5}
          canManage={result.canManage}
        />
      </section>
    </main>
  );
}
