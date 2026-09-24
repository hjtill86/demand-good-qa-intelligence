import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripePlanConfig, getStripeStatus } from "../../../lib/integration-config";

export async function POST(request: Request) {
  let body: { plan?: string; utm_source?: string; utm_campaign?: string; agreedToTerms?: string } = {};

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      const plan = formData.get("plan");
      const utmSource = formData.get("utm_source");
      const utmCampaign = formData.get("utm_campaign");
      const agreedToTerms = formData.get("agreedToTerms");
      body = {
        ...(typeof plan === "string" ? { plan } : {}),
        ...(typeof utmSource === "string" ? { utm_source: utmSource } : {}),
        ...(typeof utmCampaign === "string" ? { utm_campaign: utmCampaign } : {}),
        ...(typeof agreedToTerms === "string" ? { agreedToTerms } : {}),
      };
    }
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with a valid plan." },
      { status: 400 }
    );
  }

  if (body.agreedToTerms !== "yes") {
    return NextResponse.json(
      { error: "You must agree to the Terms and Conditions and Privacy Policy to subscribe." },
      { status: 400 }
    );
  }

  const plan = body.plan;
  const planConfig = plan ? getStripePlanConfig(plan) : null;

  if (!planConfig) {
    return NextResponse.json(
      {
        error: "Choose a valid plan: foundation or most-good.",
        acceptedPlans: ["foundation", "most-good"],
      },
      { status: 400 }
    );
  }

  const stripeStatus = getStripeStatus();

  if (!stripeStatus.configured) {
    return NextResponse.json(
      {
        status: "placeholder",
        message: "Stripe Checkout is intentionally disabled until the server-side Stripe price IDs are configured.",
        plan: planConfig,
        configured: false,
        requiredConfiguration: stripeStatus.requiredVariables,
        missingVariables: stripeStatus.missingVariables,
        nextStep:
          "Configure STRIPE_SECRET_KEY and the recurring plan price IDs in the environment, then create a real Stripe Checkout Session with the authenticated member and redirect them to Stripe.",
      },
      { status: 501 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY || !planConfig.priceId || planConfig.priceId === "not-configured") {
    return NextResponse.json(
      { error: "The selected Stripe price is not configured." },
      { status: 501 }
    );
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const suffix = Math.random().toString(36).slice(2, 10);
    const user = await currentUser();
    const customerEmail = user?.primaryEmailAddress?.emailAddress;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?plan=${planConfig.key}`,
      integration_identifier: `demand-good-qa-${suffix}`,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata: {
        plan: planConfig.key,
        terms_accepted_at: new Date().toISOString(),
        ...(user?.id ? { clerk_user_id: user.id } : {}),
        ...(body.utm_source ? { utm_source: body.utm_source } : {}),
        ...(body.utm_campaign ? { utm_campaign: body.utm_campaign } : {}),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a Checkout URL." },
        { status: 502 }
      );
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Stripe Checkout Session creation failed.", error);
    return NextResponse.json(
      { error: "Stripe Checkout could not be started. Check the server configuration and Stripe test-mode price IDs." },
      { status: 502 }
    );
  }
}
