import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BrandLogo } from "../components/brand-logo";
import { getThinkificStatus } from "../../lib/integration-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const thinkificStatus = getThinkificStatus();
  const { redirect } = await searchParams;
  const afterSignInUrl = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo />
        <div className="eyebrow">MEMBER ACCESS</div>
        <h1>Welcome back.</h1>
        <p>Sign in to your quality intelligence workspace.</p>
        <SignIn routing="hash" forceRedirectUrl={afterSignInUrl} fallbackRedirectUrl={afterSignInUrl} />
        <div className="divider">
          <span>Thinkific membership</span>
        </div>
        <p className="fine-print">
          {thinkificStatus.configured
            ? "Already a member? Open your published Thinkific memberships and member hub."
            : "Thinkific member-hub access is not configured yet."}
        </p>
        <a className="demo-link" href="/api/auth/thinkific">
          Open Thinkific member hub →
        </a>
        <Link className="back-link" href="/">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
