export function getClerkPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    ""
  );
}

export function getClerkSecretKey() {
  return process.env.CLERK_SECRET_KEY || "";
}

export function isClerkConfigured() {
  return Boolean(getClerkPublishableKey() && getClerkSecretKey());
}
