import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";

export default function CheckoutSuccessPage() {
  return (
    <main className="auth-page">
      <div className="auth-card checkout-card">
        <BrandLogo />
        <div className="eyebrow">CHECKOUT COMPLETE</div>
        <h1>Thank you for joining.</h1>
        <p>Your test checkout completed successfully. Subscription access will be managed from Stripe webhooks.</p>
        <Link className="button button-dark full" href="/login">
          Continue to member login <span>→</span>
        </Link>
      </div>
    </main>
  );
}
