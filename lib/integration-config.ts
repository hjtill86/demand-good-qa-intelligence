import crypto from "node:crypto";

export const stripePlans = {
  foundation: {
    label: "Foundation",
    amount: 149,
    cadence: "month",
    priceEnvVar: "STRIPE_FOUNDATION_PRICE_ID",
    thinkificCourseEnvVar: "THINKIFIC_FOUNDATION_COURSE_ID",
  },
  "most-good": {
    label: "Most Good",
    amount: 399,
    cadence: "month",
    priceEnvVar: "STRIPE_MOST_GOOD_PRICE_ID",
    thinkificCourseEnvVar: "THINKIFIC_MOST_GOOD_COURSE_ID",
  },
} as const;

export type StripePlanKey = keyof typeof stripePlans;

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getMissingEnvVars(required: string[]) {
  return required.filter((name) => !process.env[name] || process.env[name] === "replace_me");
}

export function getStripeStatus() {
  const requiredVariables = [
    "STRIPE_SECRET_KEY",
    stripePlans.foundation.priceEnvVar,
    stripePlans["most-good"].priceEnvVar,
  ];

  const missingVariables = getMissingEnvVars(requiredVariables);
  const configured = missingVariables.length === 0;

  return {
    configured,
    requiredVariables,
    missingVariables,
  };
}

export function getStripePlanConfig(plan: string) {
  const key = plan as StripePlanKey;
  if (!(key in stripePlans)) {
    return null;
  }

  const config = stripePlans[key];
  const priceId = process.env[config.priceEnvVar];
  const thinkificCourseId = process.env[config.thinkificCourseEnvVar];

  return {
    key,
    label: config.label,
    amount: config.amount,
    cadence: config.cadence,
    priceId: priceId ?? "not-configured",
    thinkificCourseId: thinkificCourseId ?? null,
  };
}

export function getThinkificCourseIdForPlan(plan: string): string | null {
  const key = plan as StripePlanKey;
  if (!(key in stripePlans)) {
    return null;
  }
  return process.env[stripePlans[key].thinkificCourseEnvVar] ?? null;
}

/**
 * Reverse lookup: given a Thinkific course id from an enrollment, find which
 * Stripe plan (and therefore which content tier) it corresponds to. Used by
 * the dashboard to show Foundation vs. Most Good content based on the
 * customer's actual active Thinkific enrollment.
 */
export function getPlanKeyForThinkificCourseId(courseId: string | number): StripePlanKey | null {
  const normalized = String(courseId);
  for (const key of Object.keys(stripePlans) as StripePlanKey[]) {
    if (process.env[stripePlans[key].thinkificCourseEnvVar] === normalized) {
      return key;
    }
  }
  return null;
}

export function getThinkificStatus() {
  const requiredVariables = [
    "THINKIFIC_SSO_URL",
    "THINKIFIC_SSO_CLIENT_ID",
    "THINKIFIC_SSO_CLIENT_SECRET",
    "THINKIFIC_SSO_REDIRECT_URI",
  ];
  const missingVariables = getMissingEnvVars(requiredVariables);
  const configured = missingVariables.length === 0;

  return {
    configured,
    requiredVariables,
    missingVariables,
  };
}

export function createIntegrationState() {
  return {
    state: globalThis.crypto?.randomUUID?.() ?? `dg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

export function createThinkificJwt(payload: Record<string, unknown>) {
  const secret = process.env.THINKIFIC_SSO_CLIENT_SECRET;
  if (!secret) {
    return null;
  }

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

export function verifyThinkificJwt(jwt: string) {
  const secret = process.env.THINKIFIC_SSO_CLIENT_SECRET;
  if (!secret) {
    return null;
  }

  const parts = jwt.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  if (crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signaturePart))) {
    return parseJwtPayload(payloadPart);
  }

  return null;
}

export function parseJwtPayload(encodedPayload: string) {
  try {
    const payloadPart = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadPart.padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
