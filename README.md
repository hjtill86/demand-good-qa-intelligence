# Demand Good QA Intelligence

Minimal, Vercel-ready Next.js App Router MVP for a quality and regulatory intelligence product.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then use **Member login → Open demo dashboard**. The demo link sets a local `HttpOnly` `dg_session` cookie and redirects to the protected dashboard.

## Product boundaries

- The dashboard uses intentionally static mock data for the MVP.
- Dashboard data now lives in `data/dashboard.json` and is read through the validated server-side repository in `lib/dashboard-data.ts`. Replace that reader with a database or API query when the hosted intelligence data source is ready.
- `/api/checkout` is a server-only Stripe placeholder. It accepts `{ "plan": "foundation" }` or `{ "plan": "most-good" }`, validates the plan against environment config, and returns `501` without creating a live Checkout Session. Use the server-only Stripe key and recurring price IDs in the next authenticated checkout implementation.
- Thinkific is the published membership and member-hub destination. `/api/auth/thinkific` opens the configured Thinkific member hub; it is not the identity provider for the separate Demand Good QA dashboard. The dashboard remains protected by the local demo session until a dedicated portal auth provider is selected.
- `/api/auth/demo` and `/api/auth/logout` provide local-only session behavior for previewing the protected shell. They are not production authentication.
- `.env.example` documents the server-only Stripe and Thinkific SSO variables. Never commit `.env.local`.
- No Thinkific Admin API calls are required by this demo. If added later, use only documented public paths such as `/users`, `/enrollments`, and `/course_progress`.

## Phase 2: integration wiring

The app is set up for the next handoff: Stripe and Thinkific boundaries are now config-driven and the required server variables are documented in one place. The typical next step is to add real provider configuration to Vercel, then replace the `501` placeholders with live redirect/callback logic and a secure `dg_session` cookie when production authentication is ready.

## Validation

```bash
npm run build
```
