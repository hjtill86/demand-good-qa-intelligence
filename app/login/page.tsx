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
          {thinkificStatus.configured ? "Open Thinkific member hub" : "Thinkific member hub is not configured yet"}
          <span>→</span>
        </a>

        <div className="divider">
          <span>Member access</span>
        </div>

        <p className="fine-print">
          {thinkificStatus.configured
            ? "Open your published Thinkific memberships and member hub. The separate Demand Good QA dashboard is currently available through the demo workspace below."
            : "Set THINKIFIC_SSO_URL, THINKIFIC_SSO_CLIENT_ID, THINKIFIC_SSO_CLIENT_SECRET, and THINKIFIC_SSO_REDIRECT_URI in your environment before opening the member hub."}
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
