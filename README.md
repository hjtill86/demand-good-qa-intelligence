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
- `/api/checkout` creates Stripe-hosted subscription Checkout Sessions from the configured recurring price IDs. Keep the Stripe secret and webhook signing secret server-side.
- Thinkific is the published membership and member-hub destination. `/api/auth/thinkific` now performs a real single-sign-on handoff: it reads the already-authenticated Clerk user's email/first/last name, signs a Thinkific JWT with that identity, and redirects to Thinkific. A customer who is signed in to Demand Good QA is not asked to log in again to reach the Thinkific member hub. If a visitor hits `/api/auth/thinkific` without a Clerk session, it redirects to `/login?redirect=/api/auth/thinkific` first.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to `.env.local` and Vercel; never commit `.env.local`.
- When `THINKIFIC_ADMIN_API_KEY` and `THINKIFIC_SUBDOMAIN` are configured, `/dashboard` verifies the Clerk user's email against Thinkific `/users` and `/enrollments` and requires an active, non-expired enrollment. Use the same email address in Clerk and Thinkific so the one-login flow (Clerk sign-in → Thinkific entitlement check → dashboard, or Clerk sign-in → SSO handoff into Thinkific) works without a second manual login.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.
- `.env.example` documents the Clerk, Stripe, and Thinkific variables. Never commit `.env.local`.
- No Thinkific Admin API calls are required by this demo. If added later, use only documented public paths such as `/users`, `/enrollments`, and `/course_progress`.

## Phase 2: integration wiring

The MVP now uses Clerk for portal authentication, Stripe for billing, and Thinkific for published memberships/member-hub access, connected as one login flow:

1. Customer signs in once with Clerk on `/login`.
2. `/dashboard` checks that Clerk email against Thinkific enrollment (server-side, read-only) before showing the workspace.
3. Clicking "Open Thinkific member hub" reuses the same Clerk identity to sign the customer into Thinkific via JWT SSO — no second login prompt.

The dashboard entitlement bridge is email-based and read-only; it does not create, update, or delete Thinkific records. Customers must use the same email address in Clerk and Thinkific for both the entitlement check and the SSO handoff to succeed.

## Validation

```bash
npm run build
```
