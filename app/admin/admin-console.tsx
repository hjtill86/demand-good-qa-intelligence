"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminAccount } from "../../lib/admin-accounts";

export function AdminConsole({ account }: { account: AdminAccount }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function send(action: string, extra: Record<string, unknown>, confirmText: string) {
    if (!confirm(confirmText)) return;
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: account.userId, ...extra }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not update the account.");
      return;
    }
    setMessage("Account updated. Stripe billing is unchanged.");
    router.refresh();
  }

  return (
    <section className="report-section">
      <h2>{account.name}</h2>
      <p className="fine-print">{account.email} · {account.userId}</p>
      <p className="fine-print">
        Plan {account.plan === "most-good" ? "Most Good" : "Foundation"}
        {account.seatOwnerEmail ? ` · shared login from ${account.seatOwnerEmail}` : ` · ${account.loginLimit} logins${account.loginPack ? ", including 5 extra" : ""}`}
      </p>
      <p className="fine-print">
        Created {account.createdAt.slice(0, 10) || "unknown"}
        {account.lastSignInAt ? ` · Last sign-in ${account.lastSignInAt.slice(0, 16).replace("T", " ")} UTC` : " · Has not signed in"}
      </p>
      <p className="fine-print">Workspace {account.workspaceId}</p>
      <p className="fine-print">
        Documents {labelCount(account.registers.documents)} · Training {labelCount(account.registers.training)} · Complaints {labelCount(account.registers.complaints)} · Supplier files {labelCount(account.registers.suppliers)} · Licenses {labelCount(account.registers.licenses)}
      </p>
      <div className="doc-actions">
        <button type="button" disabled={pending} onClick={() => void send("set-plan", { plan: "foundation" }, "Set this account to Foundation? Extra logins are removed from the app. Stripe keeps billing until you change it there.")}>Set Foundation</button>
        <button type="button" disabled={pending} onClick={() => void send("set-plan", { plan: "most-good" }, "Set this account to Most Good? This does not start a Stripe charge. A shared login becomes its own Most Good access.")}>Set Most Good</button>
        <button type="button" disabled={pending} onClick={() => void send("set-login-pack", { active: true }, "Turn on 5 extra logins? This does not start the $500 Stripe charge.")}>Add 5 logins</button>
        <button type="button" disabled={pending} onClick={() => void send("set-login-pack", { active: false }, "Turn off the extra 5 logins? People already invited stay until you remove them. Stripe keeps billing until you change it there.")}>Remove login pack</button>
      </div>
      {account.seats.length > 0 ? (
        <ul className="wi-steps">
          {account.seats.map((seat) => (
            <li key={seat.email}>
              {seat.email} · {seat.status}{" "}
              <button type="button" disabled={pending} onClick={() => void send("remove-seat", { email: seat.email }, `Remove ${seat.email} from this account?`)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fine-print">No extra logins on this account.</p>
      )}
      {account.organizations.length > 0 ? (
        <table className="report-table">
          <thead><tr><th>Organization</th><th>Role</th><th>Members</th><th>Login cap</th></tr></thead>
          <tbody>
            {account.organizations.map((organization) => (
              <tr key={organization.id}>
                <td>{organization.name}</td>
                <td>{organization.role}</td>
                <td>{organization.members}</td>
                <td>{organization.maxMembers === 0 ? "Unlimited" : organization.maxMembers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="fine-print">No Clerk organization. Records are stored on the personal workspace.</p>
      )}
      <p className="fine-print">Changing the plan or the login pack here updates access in the app. Cancel or change the charge in Stripe separately.</p>
      {message ? <p className="fine-print" role="status">{message}</p> : null}
    </section>
  );
}

function labelCount(value: number | null) {
  return value === null ? "unavailable" : String(value);
}
