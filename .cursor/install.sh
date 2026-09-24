#!/usr/bin/env bash
# Cloud Agent install script for Demand Good QA Intelligence (Next.js 16 App Router).
# Idempotent: safe to run repeatedly. Installs dependencies and ensures a local
# env file exists so `next dev` can boot.
set -euo pipefail

cd "$(dirname "$0")/.."

# The committed package-lock.json is not always in sync with package.json, so use
# `npm install` (not `npm ci`) to reconcile dependencies deterministically enough
# for development.
npm install

# The entire app is wrapped in Clerk (<ClerkProvider> + clerkMiddleware), so even
# the public marketing pages will not render without a Clerk publishable key.
# Create a local env file from the documented example if one does not exist yet.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

# If real Clerk keys are not supplied via Cursor secrets (process env), write
# format-valid *dummy* keys so the dev server boots and the public product
# (home, /login, /checkout) renders. These are non-functional placeholders --
# real authentication and the /dashboard workspace require real Clerk test keys,
# which take precedence when provided as environment secrets.
if [ -z "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ] \
   && grep -q '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me' .env.local; then
  DUMMY_PK="pk_test_$(printf 'demand-good-qa-dev.clerk.accounts.dev$' | base64 | tr -d '=\n')"
  DUMMY_SK="sk_test_$(printf 'demand-good-qa-dev-secret-000000000000' | base64 | tr -d '=\n')"
  sed -i "s|^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${DUMMY_PK}|" .env.local
  sed -i "s|^CLERK_SECRET_KEY=.*|CLERK_SECRET_KEY=${DUMMY_SK}|" .env.local
  echo "[install] Wrote dev-only dummy Clerk keys to .env.local (public pages only)."
fi

echo "[install] Done. Start the dev server with: npm run dev"
