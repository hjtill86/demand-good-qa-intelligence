"use client";

import { useState, type FormEvent } from "react";
import { part11Protocol, validationReadyToSign, type ValidationPackage, type ValidationTestRecord } from "../../../lib/part11-protocol";
import { formatSignature, formatUtc } from "../../../lib/part11-records";

export function ValidationRunner({
  initialPackages,
  storageError,
}: {
  initialPackages: ValidationPackage[];
  storageError?: string;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [message, setMessage] = useState(storageError ?? "");
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const open = packages.find((pkg) => pkg.protocolRevision === part11Protocol.revision && !pkg.signature);
  const signedCurrent = packages.find((pkg) => pkg.protocolRevision === part11Protocol.revision && pkg.signature);
  const history = packages.filter((pkg) => pkg !== open && pkg !== signedCurrent);

  function replace(pkg: ValidationPackage) {
    setPackages((current) => {
      const rest = current.filter((item) => item.id !== pkg.id);
      return [pkg, ...rest];
    });
  }

  async function start() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/part11-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not start the validation.");
      return;
    }
    replace(result.package as ValidationPackage);
    setMessage("Validation revision 1 is open. Record each test, then sign it.");
  }

  async function sign(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    setPending(true);
    setMessage("");
    const response = await fetch("/api/part11-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign", packageId: open.id, password }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    setPassword("");
    if (!response.ok) {
      setMessage(result.error ?? "Could not sign the validation.");
      return;
    }
    replace(result.package as ValidationPackage);
    setMessage("Validation signed. This copy stays on the account.");
  }

  return (
    <section className="report-section">
      <h2>4. Run and sign revision {part11Protocol.revision}</h2>
      <p>
        Run each test on this site. Record Pass or Fail and what you saw. Attach a screenshot or export when you have one.
        When every test is Pass, sign with the password for this account. The signed validation stays after a later release.
      </p>
      {message ? <p className="fine-print" role="status">{message}</p> : null}
      {open ? (
        <>
          {part11Protocol.tests.map((spec) => {
            const record = open.tests.find((test) => test.id === spec.id);
            return (
              <TestCard
                key={spec.id}
                packageId={open.id}
                spec={spec}
                record={record}
                pending={pending}
                onPending={setPending}
                onMessage={setMessage}
                onReplace={replace}
              />
            );
          })}
          <form className="data-form" onSubmit={sign}>
            <h2>Sign the validation</h2>
            {validationReadyToSign(open) ? (
              <p>Every test is Pass and has a note. Signing stores your name, the meaning approval, and the UTC time.</p>
            ) : (
              <p>Mark every test Pass and write what you saw before signing. A failed test stays until you run it again and mark it Pass.</p>
            )}
            <label>
              <span>Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-dark" type="submit" disabled={pending || !validationReadyToSign(open)}>Sign validation</button>
          </form>
        </>
      ) : signedCurrent ? (
        <>
          <p>Revision {part11Protocol.revision} is signed. This copy stays on the account when a later software revision opens a new validation.</p>
          <SignedPackage pkg={signedCurrent} />
        </>
      ) : (
        <button className="button button-dark" type="button" disabled={pending} onClick={() => void start()}>Start validation for revision {part11Protocol.revision}</button>
      )}
      {history.length > 0 ? (
        <>
          <h2>Signed validations</h2>
          {history.map((pkg) => <SignedPackage key={pkg.id} pkg={pkg} />)}
        </>
      ) : null}
    </section>
  );
}

function TestCard({
  packageId,
  spec,
  record,
  pending,
  onPending,
  onMessage,
  onReplace,
}: {
  packageId: string;
  spec: (typeof part11Protocol.tests)[number];
  record?: ValidationTestRecord;
  pending: boolean;
  onPending: (pending: boolean) => void;
  onMessage: (message: string) => void;
  onReplace: (pkg: ValidationPackage) => void;
}) {
  const [result, setResult] = useState(record?.result ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    onPending(true);
    onMessage("");
    const response = await fetch("/api/part11-validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record", packageId, testId: spec.id, result, notes }),
    });
    const saved = await response.json().catch(() => ({}));
    if (!response.ok) {
      onPending(false);
      onMessage(saved.error ?? "Could not save the test.");
      return;
    }
    let pkg = saved.package as ValidationPackage;
    if (file) {
      const body = new FormData();
      body.set("packageId", packageId);
      body.set("testId", spec.id);
      body.set("file", file);
      const upload = await fetch("/api/part11-validation/file", { method: "POST", body });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) {
        onReplace(pkg);
        onPending(false);
        onMessage(uploaded.error ?? "The result was saved, but the file could not be uploaded.");
        return;
      }
      pkg = uploaded.package as ValidationPackage;
      setFile(null);
    }
    onReplace(pkg);
    onPending(false);
    onMessage(`${spec.id} saved.`);
  }

  return (
    <form className="data-form" onSubmit={save}>
      <h2>{spec.id}</h2>
      <p>{spec.step}</p>
      <p>Expected: {spec.expected}</p>
      {record?.recordedAt ? <p className="fine-print">Recorded by {record.recordedBy} · {formatUtc(record.recordedAt)}</p> : null}
      {record?.fileName ? (
        <p><a href={`/api/part11-validation/file?packageId=${encodeURIComponent(packageId)}&testId=${encodeURIComponent(spec.id)}`}>{record.fileName}</a></p>
      ) : null}
      <div className="data-form-grid">
        <label>
          <span>Result</span>
          <select value={result} onChange={(event) => setResult(event.target.value as "" | "Pass" | "Fail")}>
            <option value="">Not run</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        </label>
        <label>
          <span>Attach what you saw</span>
          <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="data-field-wide">
          <span>What you saw</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>
      <button className="button button-dark" type="submit" disabled={pending}>Save {spec.id}</button>
    </form>
  );
}

function SignedPackage({ pkg }: { pkg: ValidationPackage }) {
  return (
    <article className="doc-card">
      <b>Revision {pkg.protocolRevision} · {pkg.protocolDated}</b>
      {pkg.signature ? <span>Signed {formatSignature(pkg.signature)}</span> : <span>Not signed</span>}
      <ul className="revision-list">
        {pkg.tests.map((test) => (
          <li key={test.id}>
            {test.id} · {test.result || "Not run"}
            {test.notes ? ` · ${test.notes}` : ""}
            {test.fileName ? <> · <a href={`/api/part11-validation/file?packageId=${encodeURIComponent(pkg.id)}&testId=${encodeURIComponent(test.id)}`}>{test.fileName}</a></> : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
