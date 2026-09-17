import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";
import { getStripePlanConfig, getStripeStatus } from "../../lib/integration-config";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedPlan =
    getStripePlanConfig(resolvedSearchParams.plan ?? "foundation") ??
    getStripePlanConfig("foundation");
  const stripeStatus = getStripeStatus();

  return (
    <main className="auth-page">
      <div className="auth-card checkout-card">
        <BrandLogo />
        <div className="eyebrow">BILLING CHECKOUT</div>
        <h1>{selectedPlan?.label ?? "Foundation"}</h1>
        <p>
          {selectedPlan?.amount ?? 149} USD / {selectedPlan?.cadence ?? "month"}
        </p>

        <div className="checkout-box">
          <div>
            <span className="checkout-label">Plan</span>
            <strong>{selectedPlan?.label}</strong>
          </div>
          <div>
            <span className="checkout-label">Stripe status</span>
            <strong>{stripeStatus.configured ? "Ready to connect" : "Environment required"}</strong>
          </div>
        </div>

        <form method="POST" action="/api/checkout">
          <input type="hidden" name="plan" value={selectedPlan?.key ?? "foundation"} />
          <button type="submit" className="button button-dark full">
            Start secure checkout preview <span>→</span>
          </button>
        </form>

        <p className="fine-print">
          {stripeStatus.configured
            ? "You will be redirected to Stripe&apos;s secure test checkout. No live charge will be made."
            : "Configure the server-side Stripe test values before starting checkout."}
        </p>

        <div className="link-row">
          <Link className="back-link" href="/login">
            ← Back to login
          </Link>
          <Link className="demo-link" href="/api/auth/demo?redirect=/dashboard">
            Skip to dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
