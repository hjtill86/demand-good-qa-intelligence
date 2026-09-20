import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BrandLogo } from "../components/brand-logo";
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
        <LegalGate>
          <SignIn routing="hash" forceRedirectUrl={afterSignInUrl} fallbackRedirectUrl={afterSignInUrl} />
        </LegalGate>
        <Link className="back-link" href="/">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
