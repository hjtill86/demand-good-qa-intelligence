import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isClerkConfigured } from "../../../../lib/clerk-config";
import { getStripeWebhookSecret, type StripePlanKey } from "../../../../lib/integration-config";

function asPlan(value: string | null | undefined): StripePlanKey | null {
  return value === "foundation" || value === "most-good" ? value : null;
}

async function assignDgqiPlan(input: {
  plan: StripePlanKey;
  userId?: string | null;
  email?: string | null;
}) {
  if (!isClerkConfigured()) {
    console.error("Clerk is not configured, so the paid plan was not assigned.");
    return;
  }

  const client = await clerkClient();
  let userId = input.userId?.trim() || null;

  if (!userId && input.email) {
    const matches = await client.users.getUserList({ emailAddress: [input.email], limit: 5 });
    userId = matches.data[0]?.id ?? null;
  }

  if (!userId && input.email) {
    const created = await client.users.createUser({
      emailAddress: [input.email],
      skipPasswordRequirement: true,
      publicMetadata: { dgqiPlan: input.plan },
    });
    console.info("Created a Clerk member for a Stripe subscription.", { plan: input.plan });
    return created.id;
  }

  if (!userId) {
    console.error("Stripe payment could not be matched to a Clerk member.");
    return;
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { dgqiPlan: input.plan },
  });
  console.info("Assigned DGQI plan from Stripe.", { plan: input.plan });
  return userId;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured.");
    return NextResponse.json(
      { error: "Stripe webhook signing secret is not configured." },
      { status: 400 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe-Signature header is missing." },
      { status: 400 }
    );
  }

  const payload = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.info("Stripe subscription event received.", {
        eventId: event.id,
        eventType: event.type,
      });

      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        break;
      }

      const email = session.customer_details?.email ?? session.customer_email;
      const plan = asPlan(session.metadata?.plan);
      if (plan) {
        await assignDgqiPlan({
          plan,
          userId: session.metadata?.clerk_user_id,
          email,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      let email: string | null = null;
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          email = "deleted" in customer && customer.deleted ? null : customer.email;
        } catch (error) {
          console.error("Could not read the Stripe customer for a canceled subscription.", error);
        }
      }
      await assignDgqiPlan({
        plan: "foundation",
        userId: subscription.metadata?.clerk_user_id,
        email,
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const ended = subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "incomplete_expired";
      const plan = ended ? "foundation" : asPlan(subscription.metadata?.plan);
      if (!plan) break;
      await assignDgqiPlan({
        plan,
        userId: subscription.metadata?.clerk_user_id,
        email: null,
      });
      break;
    }
    case "checkout.session.async_payment_failed":
    case "invoice.paid":
    case "invoice.payment_failed":
      console.info("Stripe subscription event received.", {
        eventId: event.id,
        eventType: event.type,
      });
      break;
    default:
      console.info("Ignoring unsupported Stripe event.", {
        eventId: event.id,
        eventType: event.type,
      });
  }

  return NextResponse.json({ received: true });
}
