import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { BrandLogo } from "../components/brand-logo";
import { isClerkConfigured } from "../../lib/clerk-config";
import { getDgqiPlan } from "../../lib/dgqi-entitlements";
import { getStripePlanConfig, getStripeStatus, loginPack } from "../../lib/integration-config";
import { loginLimit } from "../../lib/team-seats";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; utm_source?: string; utm_campaign?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  if (resolvedSearchParams.plan === loginPack.key) {
    const user = isClerkConfigured() ? await currentUser().catch(() => null) : null;
    const hasMostGood = getDgqiPlan(user) === "most-good";
    const alreadyAdded = loginLimit(user?.publicMetadata) > 5;
    return (
      <main className="auth-page">
        <div className="auth-card checkout-card">
          <BrandLogo />
          <div className="eyebrow">MOST GOOD</div>
          <h1>{loginPack.label}</h1>
          <p>{`$${loginPack.amount.toFixed(2)} USD / ${loginPack.cadence}`}</p>
          <p className="fine-print">
            Adds 5 logins on top of the 5 included with Most Good. The extra logins stay until this add-on is canceled.
          </p>
          {!user ? (
            <p className="fine-print">Sign in to the Most Good account before adding logins. <a href="/login">Member login</a></p>
          ) : null}
          {user && !hasMostGood ? (
            <p className="fine-print">This add-on is for an active Most Good subscription. <a href="/checkout?plan=most-good">Choose Most Good</a></p>
          ) : null}
          {alreadyAdded ? <p className="fine-print">The additional 5 logins are already on this account.</p> : null}
          {user && hasMostGood && !alreadyAdded ? (
            <form method="POST" action="/api/checkout">
              <input type="hidden" name="plan" value={loginPack.key} />
              {resolvedSearchParams.utm_source ? <input type="hidden" name="utm_source" value={resolvedSearchParams.utm_source} /> : null}
              {resolvedSearchParams.utm_campaign ? <input type="hidden" name="utm_campaign" value={resolvedSearchParams.utm_campaign} /> : null}
              <label className="legal-check">
                <input type="checkbox" name="agreedToTerms" value="yes" required />
                <span>
                  I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
                </span>
              </label>
              <button type="submit" className="button button-dark full">
                Add 5 logins <span>→</span>
              </button>
            </form>
          ) : null}
          <div className="link-row">
            <Link className="back-link" href="/dashboard/team">← Back to logins</Link>
          </div>
        </div>
      </main>
    );
  }
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
          {`$${selectedPlan?.amount.toFixed(2) ?? "300.00"} USD / ${selectedPlan?.cadence ?? "month"}`}
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
          {resolvedSearchParams.utm_source ? (
            <input type="hidden" name="utm_source" value={resolvedSearchParams.utm_source} />
          ) : null}
          {resolvedSearchParams.utm_campaign ? (
            <input type="hidden" name="utm_campaign" value={resolvedSearchParams.utm_campaign} />
          ) : null}
          <label className="legal-check">
            <input type="checkbox" name="agreedToTerms" value="yes" required />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noreferrer">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          <button type="submit" className="button button-dark full">
            Start secure Stripe checkout <span>→</span>
          </button>
        </form>

        <p className="fine-print">
          {stripeStatus.configured
            ? "You will be redirected to Stripe's secure checkout to complete a live monthly subscription."
            : "Configure the server-side Stripe secret key and price IDs before starting checkout."}
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
