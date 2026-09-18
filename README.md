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
- Thinkific is the published membership and member-hub destination. `/api/auth/thinkific` opens the configured Thinkific member hub; it is not the identity provider for the separate Demand Good QA dashboard.
- Clerk protects `/dashboard` and supplies the portal identity. Add the two Clerk keys from the Clerk dashboard to `.env.local` and Vercel; never commit `.env.local`.
- `/api/auth/demo` and `/api/auth/logout` are retained only as local legacy routes and are not used for dashboard protection.
- `.env.example` documents the Clerk, Stripe, and Thinkific variables. Never commit `.env.local`.
- No Thinkific Admin API calls are required by this demo. If added later, use only documented public paths such as `/users`, `/enrollments`, and `/course_progress`.

## Phase 2: integration wiring

The MVP now uses Clerk for portal authentication, Stripe for billing, and Thinkific for published memberships/member-hub access. Membership entitlement synchronization between Thinkific and Clerk is intentionally not implemented; add a server-side entitlement check before restricting dashboard access to specific memberships.

## Validation

```bash
npm run build
```
