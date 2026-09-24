import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BrandLogo } from "../components/brand-logo";
import { isClerkConfigured } from "../../lib/clerk-config";
import { LegalGate } from "./legal-gate";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const afterSignInUrl = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo />
        <div className="eyebrow">MEMBER ACCESS</div>
        <h1>Welcome back.</h1>
        <p>Sign in to your quality intelligence workspace.</p>
        {isClerkConfigured() ? (
          <LegalGate>
            <SignIn routing="hash" forceRedirectUrl={afterSignInUrl} fallbackRedirectUrl={afterSignInUrl} />
          </LegalGate>
        ) : (
          <p>Member login will be available once Clerk keys are added to production.</p>
        )}
        <Link className="back-link" href="/">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
