import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { BrandLogo } from "../components/brand-logo";
import { isClerkConfigured } from "../../lib/clerk-config";
import { LegalGate } from "../login/legal-gate";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo />
        <div className="eyebrow">MEMBER ACCESS</div>
        <h1>Create your account.</h1>
        <p>Set up your quality intelligence workspace.</p>
        {isClerkConfigured() ? (
          <LegalGate>
            <SignUp
              routing="hash"
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
              signInUrl="/login"
            />
          </LegalGate>
        ) : (
          <p>Account creation will be available once Clerk keys are added to production.</p>
        )}
        <Link className="back-link" href="/login">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
