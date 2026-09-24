"use client";

import { useState } from "react";

const TERMS_URL = "https://courses.demandgoodqa.com/pages/terms";
const PRIVACY_URL = "https://courses.demandgoodqa.com/pages/privacy";

export function LegalGate({ children }: { children: React.ReactNode }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="legal-gate">
      <label className="legal-check">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span>
          I agree to the{" "}
          <a href={TERMS_URL} target="_blank" rel="noreferrer">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <div className={agreed ? "legal-gated" : "legal-gated locked"} aria-disabled={!agreed}>
        {agreed ? children : (
          <div className="legal-lock">
            <p>Please agree to the Terms and Conditions and Privacy Policy above to continue.</p>
          </div>
        )}
      </div>
    </div>
  );
}
