export const stripePlans = {
  foundation: {
    label: "Foundation",
    amount: 300,
    cadence: "month",
    priceEnvVar: "STRIPE_FOUNDATION_PRICE_ID",
  },
  "most-good": {
    label: "Most Good",
    amount: 500,
    cadence: "month",
    priceEnvVar: "STRIPE_MOST_GOOD_PRICE_ID",
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

export function getStripeWebhookSecret() {
  const names = [
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_WEBHOOK_SIGNING_SECRET",
    "STRIPE_SIGNING_SECRET",
  ];
  for (const name of names) {
    const value = process.env[name];
    if (value && value !== "replace_me") {
      return value;
    }
  }
  return null;
}

export function getStripePlanConfig(plan: string) {
  const key = plan as StripePlanKey;
  if (!(key in stripePlans)) {
    return null;
  }

  const config = stripePlans[key];
  const priceId = process.env[config.priceEnvVar];

  return {
    key,
    label: config.label,
    amount: config.amount,
    cadence: config.cadence,
    priceId: priceId ?? "not-configured",
  };
}
