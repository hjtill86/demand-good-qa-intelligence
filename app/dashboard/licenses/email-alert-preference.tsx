"use client";

import { useState } from "react";

type Props = {
  enabled: boolean;
};

export function EmailAlertPreference({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function updatePreference(nextEnabled: boolean) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/licenses/email-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update email alerts.");
      }

      setEnabled(nextEnabled);
      setMessage(nextEnabled ? "Email alerts are on." : "Email alerts are off.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update email alerts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="email-alert-preference">
      <label className="email-alert-toggle">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => updatePreference(event.target.checked)}
        />
        <span>
          <b>Email renewal alerts</b>
          <small>Receive an email when a license or certification needs attention.</small>
        </span>
      </label>
      {message ? <span className="fine-print">{message}</span> : null}
    </div>
  );
}
