"use client";

import { useState, type FormEvent } from "react";

type Invite = {
  id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string;
};

type Props = {
  initialInvites: Invite[];
};

export function InviteManager({ initialInvites }: Props) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/organization/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = (await response.json()) as {
        invite?: Invite;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !body.invite) {
        throw new Error(body.error ?? "Could not send the invitation.");
      }

      setInvites((current) => [body.invite as Invite, ...current.filter((item) => item.email !== body.invite!.email)]);
      setEmail("");
      setRole("member");
      setMessage(body.warning ? `Invite created, but: ${body.warning}` : `Invitation sent to ${body.invite.email}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setMessage("");
    setError("");
    const response = await fetch(`/api/organization/invites/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not revoke the invitation.");
      return;
    }
    setInvites((current) => current.filter((item) => item.id !== id));
    setMessage("Invitation revoked.");
  }

  return (
    <>
      <section className="report-section">
        <h2>Invite a team member</h2>
        <p className="fine-print">
          They&apos;ll receive an email with a secure link to join your workspace. Invitations expire after 7 days.
        </p>
        <form onSubmit={sendInvite} className="data-form">
          <div className="data-form-grid">
            <label className="data-field-wide">
              <span>Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
              />
            </label>
            <label>
              <span>Role</span>
              <select value={role} onChange={(event) => setRole(event.target.value as "admin" | "member")}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button className="button button-dark" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </form>
        {message ? <p className="fine-print" role="status">{message}</p> : null}
        {error ? <p className="fine-print" role="alert" style={{ color: "#b42318" }}>{error}</p> : null}
      </section>

      <section className="report-section">
        <h2>Pending invitations ({invites.length})</h2>
        {invites.length === 0 ? (
          <p className="fine-print">No pending invitations.</p>
        ) : (
          invites.map((invite) => (
            <div className="action-row" key={invite.id}>
              <div>
                <b>{invite.email}</b>
                <span>
                  {invite.role === "admin" ? "Admin" : "Member"} · invited{" "}
                  {new Date(invite.created_at).toLocaleDateString()} · expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </div>
              <button type="button" onClick={() => void revoke(invite.id)}>
                Revoke
              </button>
            </div>
          ))
        )}
      </section>
    </>
  );
}
