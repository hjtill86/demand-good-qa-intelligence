"use client";

import { useState, type FormEvent } from "react";

type LoginRow = { email: string; pending: boolean };

export function TeamLogins({
  ownerEmail,
  initialSeats,
  limit,
  extraLogins,
  canManage,
}: {
  ownerEmail: string;
  initialSeats: LoginRow[];
  limit: number;
  extraLogins: boolean;
  canManage: boolean;
}) {
  const [seats, setSeats] = useState(initialSeats);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const used = 1 + seats.length;
  const full = used >= limit;

  function apply(next: LoginRow[], note: string) {
    setSeats(next);
    setMessage(note);
  }

  async function addLogin(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not add that login.");
      return;
    }
    const next = (result.seats as { email: string; userId?: string }[]).map((seat) => ({
      email: seat.email,
      pending: !seat.userId,
    }));
    setEmail("");
    apply(next, "Login saved. They can sign in and see this company's workspace.");
  }

  async function removeLogin(address: string) {
    if (!confirm(`Remove ${address} from this subscription?`)) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/team?email=${encodeURIComponent(address)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not remove that login.");
      return;
    }
    const next = (result.seats as { email: string; userId?: string }[]).map((seat) => ({
      email: seat.email,
      pending: !seat.userId,
    }));
    apply(next, "Login removed.");
  }

  return (
    <>
      <p className="login-count">{used} of {limit} logins</p>
      <article className="doc-card">
        <b>{ownerEmail || "Subscription holder"}</b>
        <span>Subscription holder</span>
      </article>
      {seats.map((seat) => (
        <article className="doc-card" key={seat.email}>
          <b>{seat.email}</b>
          <span>{seat.pending ? "Invitation sent" : "Active login"}</span>
          {canManage ? (
            <div className="doc-actions">
              <button type="button" disabled={pending} onClick={() => void removeLogin(seat.email)}>Remove</button>
            </div>
          ) : null}
        </article>
      ))}
      {canManage && !full ? (
        <form onSubmit={addLogin} className="data-form">
          <h2>Add a login</h2>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@company.com" required />
          </label>
          <button className="button button-dark" type="submit" disabled={pending}>Send login</button>
        </form>
      ) : null}
      {canManage && full ? <p className="fine-print">All {limit} logins are in use. Remove one before adding another.</p> : null}
      {canManage && !extraLogins ? (
        <p className="fine-print">Add 5 more logins for $500 per month. <a href="/checkout?plan=login-pack">Add logins</a></p>
      ) : null}
      {!canManage ? <p className="fine-print">The subscription holder manages these logins.</p> : null}
      {message ? <p className="fine-print" role="status">{message}</p> : null}
    </>
  );
}
