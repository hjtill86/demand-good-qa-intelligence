"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

export function AcceptInvite({ token }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function accept() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/organization/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as { accepted?: boolean; error?: string };

      if (!response.ok || !body.accepted) {
        throw new Error(body.error ?? "Could not accept this invitation.");
      }

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Could not accept this invitation.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="fine-print" role="status">
        You&apos;re in! Redirecting you to the dashboard…
      </p>
    );
  }

  return (
    <>
      <button className="button button-dark" type="button" onClick={() => void accept()} disabled={busy}>
        {busy ? "Joining…" : "Accept invitation"}
      </button>
      {error ? (
        <p className="fine-print" role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
