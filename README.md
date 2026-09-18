# Demand Good QA Intelligence

Minimal, Vercel-ready Next.js App Router MVP for a quality and regulatory intelligence product.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then use **Member login** to create or sign in to a Clerk account. The dashboard is protected by Clerk authentication; the Thinkific link remains a separate member-hub destination.

## Product boundaries

- The dashboard uses intentionally static mock data for the MVP.
- Dashboard data now lives in `data/dashboard.json` and is read through the validated server-side repository in `lib/dashboard-data.ts`. Replace that reader with a database or API query when the hosted intelligence data source is ready.
- **Where customers buy:** the single purchase point is `/checkout` on Demand Good QA (Stripe). There is no separate Thinkific purchase step for subscribers — paying for Foundation or Most Good automatically grants the matching Thinkific membership. Customers should not be sent to buy directly on Thinkific.
- `/api/checkout` creates Stripe-hosted subscription Checkout Sessions from the configured recurring price IDs, tagged with the plan and (when signed in) the Clerk email/user id as metadata. Keep the Stripe secret and webhook signing secret server-side.
- `/api/webhooks/stripe` fulfills the purchase on `checkout.session.completed`: it reads the paid session's customer email and plan, maps the plan to a Thinkific course via `THINKIFIC_FOUNDATION_COURSE_ID` / `THINKIFIC_MOST_GOOD_COURSE_ID`, finds-or-creates the matching Thinkific user, and enrolls them — so the Stripe subscription is what unlocks Thinkific access, automatically.
- Thinkific is still the membership/course *content* platform and member-hub destination. `/api/auth/thinkific` performs a single-sign-on handoff: it reads the already-authenticated Clerk user's email/first/last name, signs a Thinkific JWT with that identity, and redirects to Thinkific. A customer who is signed in to Demand Good QA is not asked to log in again to reach the Thinkific member hub. If a visitor hits `/api/auth/thinkific` without a Clerk session, it redirects to `/login?redirect=/api/auth/thinkific` first.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to `.env.local` and Vercel; never commit `.env.local`.
- When `THINKIFIC_ADMIN_API_KEY` and `THINKIFIC_SUBDOMAIN` are configured, `/dashboard` verifies the Clerk user's email against Thinkific `/users` and `/enrollments` and requires an active, non-expired enrollment. Use the same email address in Clerk and Thinkific so the one-login flow (Stripe purchase → auto-enrollment → Clerk sign-in → dashboard, or Clerk sign-in → SSO handoff into Thinkific) works without a second manual purchase or login.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.
- `.env.example` documents the Clerk, Stripe, and Thinkific variables. Never commit `.env.local`.
- Thinkific Admin API calls are limited to documented public paths: `GET /users`, `POST /users`, `GET /enrollments`, and `POST /enrollments`. No Thinkific data is deleted or mutated outside of creating the user/enrollment needed to fulfill a paid Stripe subscription.

## Phase 2: integration wiring

The MVP connects Clerk (auth), Stripe (billing), and Thinkific (membership/course content) into one purchase + one login:

1. Customer subscribes once on Demand Good QA via Stripe Checkout (`/checkout`).
2. The Stripe webhook automatically creates/enrolls that same email in the matching Thinkific membership — no second purchase on Thinkific.
3. Customer signs in once with Clerk on `/login`.
4. `/dashboard` checks that Clerk email against Thinkific enrollment (server-side, read-only) before showing the workspace.
5. Clicking "Open Thinkific member hub" reuses the same Clerk identity to sign the customer into Thinkific via JWT SSO — no second login prompt.

Fulfillment (steps 1–2) is create/enroll-only. The entitlement check (step 4) is read-only. Customers must use the same email address across Stripe, Clerk, and Thinkific for the whole flow to resolve automatically.

## Validation

```bash
npm run build
```
