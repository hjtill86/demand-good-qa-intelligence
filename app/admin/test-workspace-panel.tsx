"use client";

import { useState } from "react";

const testWorkspaceEmail = "dgqi-test-workspace@demandgoodqa.com";

export function TestWorkspacePanel() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function send(action: "open" | "reset") {
    if (action === "reset" && !confirm("Clear every record in the test workspace and set it back to Most Good?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setMessage(result.error ?? "Could not use the test workspace.");
      return;
    }
    if (action === "open" && typeof result.url === "string") {
      window.location.assign(result.url);
      return;
    }
    setPending(false);
    setMessage(result.storageCleared === false
      ? "Test access was reset. Stored files could not be cleared."
      : "Test workspace cleared and set back to Most Good.");
  }

  return (
    <section className="report-section">
      <h2>Test workspace</h2>
      <p className="fine-print">
        Opens a separate subscriber, {testWorkspaceEmail}, with Most Good and the extra 5 logins.
        Documents, training, complaints, supplier files, licenses, and the auditor packet saved there stay off customer accounts.
        To see Foundation, look up that email below and set Foundation before you open it.
      </p>
      <p className="fine-print">
        Checkout and login invitations from the test workspace still use the live site. Do not pay or invite a colleague unless you mean to.
      </p>
      <div className="doc-actions">
        <button className="button button-dark" type="button" disabled={pending} onClick={() => void send("open")}>Open test workspace</button>
        <button type="button" disabled={pending} onClick={() => void send("reset")}>Reset test data</button>
      </div>
      {message ? <p className="fine-print" role="status">{message}</p> : null}
    </section>
  );
}
