import { NextResponse } from "next/server";
import { getClerkPublishableKey, getClerkSecretKey, isClerkConfigured } from "../../../lib/clerk-config";
import { getStripeStatus, getStripeWebhookSecret } from "../../../lib/integration-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const stripe = getStripeStatus();
  return NextResponse.json({
    ok: true,
    clerk: isClerkConfigured(),
    hasPublishableKey: Boolean(getClerkPublishableKey()),
    hasSecretKey: Boolean(getClerkSecretKey()),
    hasAppUrl: Boolean(process.env["NEXT_PUBLIC_APP_URL"]),
    stripe: stripe.configured,
    hasStripeWebhookSecret: Boolean(getStripeWebhookSecret()),
  });
}
