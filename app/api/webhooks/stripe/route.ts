import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getThinkificCourseIdForPlan } from "../../../../lib/integration-config";
import { fulfillThinkificMembership } from "../../../../lib/thinkific-entitlements";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook signing configuration is missing." },
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

      if (session.payment_status !== "paid") {
        break;
      }

      const email = session.customer_details?.email;
      const plan = session.metadata?.plan;
      const courseId = plan ? getThinkificCourseIdForPlan(plan) : null;

      if (!email || !courseId) {
        console.info("Skipping Thinkific fulfillment: missing customer email or mapped course id.", {
          eventId: event.id,
          hasEmail: Boolean(email),
          plan,
        });
        break;
      }

      const nameParts = session.customer_details?.name?.split(" ") ?? [];
      const result = await fulfillThinkificMembership(email, courseId, {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || undefined,
      });

      if (result.status === "error") {
        console.error("Thinkific fulfillment failed after Stripe payment.", {
          eventId: event.id,
          email,
          plan,
          error: result.error,
        });
      } else if (result.status === "enrolled") {
        console.info("Thinkific membership enrolled after Stripe payment.", {
          eventId: event.id,
          email,
          plan,
        });
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
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
