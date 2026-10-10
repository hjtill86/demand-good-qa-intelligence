"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LicenseFileControl({
  recordId,
  fileName,
  onChanged,
}: {
  recordId: string;
  fileName?: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(file: File) {
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("id", recordId);
    body.set("file", file);
    const response = await fetch("/api/licenses/file", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not upload the file.");
      return;
    }
    setMessage("File saved.");
    onChanged?.();
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove the uploaded file from this record?")) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/licenses/file?id=${encodeURIComponent(recordId)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not remove the file.");
      return;
    }
    setMessage("File removed.");
    onChanged?.();
    router.refresh();
  }

  return (
    <div className="license-file">
      {fileName ? (
        <a href={`/api/licenses/file?id=${encodeURIComponent(recordId)}`}>{fileName}</a>
      ) : (
        <span>No file yet</span>
      )}
      <label>
        {pending ? "Saving…" : fileName ? "Replace" : "Upload"}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      {fileName ? (
        <button type="button" onClick={() => void remove()} disabled={pending}>
          Remove file
        </button>
      ) : null}
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
