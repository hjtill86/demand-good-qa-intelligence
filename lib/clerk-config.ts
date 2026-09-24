function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getClerkPublishableKey() {
  return readEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") || readEnv("CLERK_PUBLISHABLE_KEY");
}

export function getClerkSecretKey() {
  return readEnv("CLERK_SECRET_KEY");
}

export function isClerkConfigured() {
  return Boolean(getClerkPublishableKey() && getClerkSecretKey());
}
