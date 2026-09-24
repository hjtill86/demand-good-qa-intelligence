import Link from "next/link";
import { isClerkConfigured } from "../../lib/clerk-config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Member login is not configured yet.</h1>
          <p>
            Add Clerk publishable and secret keys to the production environment, then redeploy,
            to enable sign-in and the dashboard.
          </p>
          <Link className="back-link" href="/">
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  return children;
}
