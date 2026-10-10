"use client";

import { FormEvent, useState } from "react";
import { SignIn, useClerk, useSignIn } from "@clerk/nextjs";

type AuthMode = "sign-in" | "forgot";
type ResetStep = "email" | "code";

function clerkMessage(error: { longMessage?: string; message?: string } | null) {
  return error?.longMessage || error?.message || "Something went wrong. Try again.";
}

export function MemberAuth({ afterSignInUrl }: { afterSignInUrl: string }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");

  return (
    <div className="member-auth">
      {mode === "sign-in" ? (
        <>
          <SignIn
            routing="hash"
            forceRedirectUrl={afterSignInUrl}
            fallbackRedirectUrl={afterSignInUrl}
            signUpUrl="/sign-up"
            withSignUp
          />
          <div className="auth-help">
            <a href="/sign-up">Create an account</a>
            <button type="button" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          </div>
        </>
      ) : (
        <ForgotPassword afterSignInUrl={afterSignInUrl} onBack={() => setMode("sign-in")} />
      )}
    </div>
  );
}

function ForgotPassword({
  afterSignInUrl,
  onBack,
}: {
  afterSignInUrl: string;
  onBack: () => void;
}) {
  const { loaded } = useClerk();
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = !loaded || fetchStatus === "fetching" || pending;

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!loaded) return;
    setError("");
    setPending(true);
    try {
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) {
        setError(clerkMessage(created.error));
        return;
      }
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) {
        setError(clerkMessage(sent.error));
        return;
      }
      setStep("code");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (!loaded) return;
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (password.length < 15) {
      setError("Use at least 15 characters.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const verified = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verified.error) {
        setError(clerkMessage(verified.error));
        return;
      }
      const submitted = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (submitted.error) {
        setError(clerkMessage(submitted.error));
        return;
      }
      if (signIn.status !== "complete") {
        setError("The code or password was not accepted. Request a new code and try again.");
        return;
      }
      const finalized = await signIn.finalize({
        navigate: async ({ decorateUrl }) => {
          window.location.assign(decorateUrl(afterSignInUrl));
        },
      });
      if (finalized.error) setError(clerkMessage(finalized.error));
    } finally {
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <form className="auth-reset" onSubmit={sendCode}>
        <p>Enter the email on your account. We will send a reset code.</p>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <button className="button button-dark full" type="submit" disabled={busy}>
          {pending ? "Sending code…" : "Send reset code"}
        </button>
        <button className="auth-text-button" type="button" onClick={onBack}>
          ← Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form className="auth-reset" onSubmit={resetPassword}>
      <p>Enter the code from your email and choose a new password. Use at least 15 characters.</p>
      <label>
        Reset code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="button button-dark full" type="submit" disabled={busy}>
        {pending ? "Updating password…" : "Update password"}
      </button>
      <button className="auth-text-button" type="button" onClick={() => setStep("email")} disabled={pending}>
        Send a new code
      </button>
    </form>
  );
}
