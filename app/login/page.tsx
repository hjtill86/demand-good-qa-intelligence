import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";
import { getThinkificStatus } from "../../lib/integration-config";

export default function LoginPage() {
  const thinkificStatus = getThinkificStatus();

  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo />
        <div className="eyebrow">MEMBER ACCESS</div>
        <h1>Welcome back.</h1>
        <p>Sign in to your quality intelligence workspace.</p>

        <a className="button button-dark full" href="/api/auth/thinkific">
          {thinkificStatus.configured ? "Continue with Thinkific SSO" : "Thinkific SSO is not configured yet"}
          <span>→</span>
        </a>

        <div className="divider">
          <span>SSO integration boundary</span>
        </div>

        <p className="fine-print">
          {thinkificStatus.configured
            ? "This integration is ready for a configured Thinkific provider and will validate the callback state before creating a secure member session."
            : "Set THINKIFIC_SSO_URL, THINKIFIC_SSO_CLIENT_ID, THINKIFIC_SSO_CLIENT_SECRET, and THINKIFIC_SSO_REDIRECT_URI in your environment before attempting live SSO."}
        </p>

        <Link className="demo-link" href="/api/auth/demo?redirect=/dashboard">
          Open demo dashboard →
        </Link>
        <Link className="back-link" href="/">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
