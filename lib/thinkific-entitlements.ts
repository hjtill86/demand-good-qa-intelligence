import { getPlanKeyForThinkificCourseId, type StripePlanKey } from "./integration-config";

type ThinkificUser = {
  id: number;
  email: string;
};

type ThinkificEnrollment = {
  user_id: number;
  course_id?: number;
  status?: string;
  expiry_date?: string | null;
};

type ThinkificCollection<T> = {
  items?: T[];
};

export type ThinkificAccessResult =
  | { status: "active"; email: string; plan: StripePlanKey | null }
  | { status: "not-enrolled"; email: string }
  | { status: "not-configured"; email: string }
  | { status: "error"; email: string };

export type ThinkificFulfillmentResult =
  | { status: "enrolled" }
  | { status: "not-configured" }
  | { status: "error"; error: string };

function getThinkificApiUrl(path: string) {
  const baseUrl = process.env.THINKIFIC_API_URL ?? "https://api.thinkific.com";
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/public/v1${path}`;
}

function getThinkificCredentials() {
  const apiKey = process.env.THINKIFIC_ADMIN_API_KEY;
  const subdomain = process.env.THINKIFIC_SUBDOMAIN;
  if (!apiKey || !subdomain) {
    return null;
  }
  return { apiKey, subdomain };
}

async function thinkificRequest<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<T | null> {
  const url = getThinkificApiUrl(path);
  const credentials = getThinkificCredentials();
  if (!url || !credentials) {
    return null;
  }

  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "X-Auth-API-Key": credentials.apiKey,
      "X-Auth-Subdomain": credentials.subdomain,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    // GET responses may be cached briefly; writes are never cached.
    ...(init?.method === "POST" ? {} : { next: { revalidate: 300 } }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`Thinkific API request failed: ${response.status} ${response.statusText} ${detail}`);
    return null;
  }

  return response.json() as Promise<T>;
}

async function findThinkificUser(email: string): Promise<ThinkificUser | null> {
  const params = new URLSearchParams({ "query[email]": email, limit: "1" });
  const users = await thinkificRequest<ThinkificCollection<ThinkificUser>>(`/users?${params}`);
  return users?.items?.[0] ?? null;
}

export async function getThinkificAccess(email: string): Promise<ThinkificAccessResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!getThinkificCredentials() || !getThinkificApiUrl("/users")) {
    return { status: "not-configured", email: normalizedEmail };
  }

  try {
    const user = await findThinkificUser(normalizedEmail);
    if (!user) {
      return { status: "not-enrolled", email: normalizedEmail };
    }

    const enrollments = await thinkificRequest<ThinkificCollection<ThinkificEnrollment>>(
      `/enrollments?user_id=${user.id}&limit=100`,
    );
    const activeEnrollments = enrollments?.items?.filter((enrollment) => {
      if (enrollment.status?.toLowerCase() !== "active") {
        return false;
      }
      return !enrollment.expiry_date || new Date(enrollment.expiry_date) > new Date();
    });

    if (!activeEnrollments || activeEnrollments.length === 0) {
      return { status: "not-enrolled", email: normalizedEmail };
    }

    // Most Good includes Foundation's dashboard plus more, so if the
    // customer holds both memberships, prefer the higher tier.
    const plans = activeEnrollments
      .map((enrollment) => (enrollment.course_id ? getPlanKeyForThinkificCourseId(enrollment.course_id) : null))
      .filter((plan): plan is StripePlanKey => plan !== null);
    const plan = plans.includes("most-good") ? "most-good" : plans[0] ?? null;

    return { status: "active", email: normalizedEmail, plan };
  } catch (error) {
    console.error("Thinkific entitlement check failed", error);
    return { status: "error", email: normalizedEmail };
  }
}

/**
 * Fulfills a paid Demand Good QA subscription by granting the matching
 * Thinkific membership: finds (or creates) the Thinkific user for this email
 * and enrolls them in the course/product tied to the purchased plan. Called
 * from the Stripe webhook so a single Stripe purchase is the only checkout a
 * customer needs — Thinkific access follows automatically.
 */
export async function fulfillThinkificMembership(
  email: string,
  courseId: string,
  name?: { firstName?: string; lastName?: string },
): Promise<ThinkificFulfillmentResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!getThinkificCredentials() || !getThinkificApiUrl("/users")) {
    return { status: "not-configured" };
  }

  try {
    let user = await findThinkificUser(normalizedEmail);

    if (!user) {
      user = await thinkificRequest<ThinkificUser>("/users", {
        method: "POST",
        body: {
          email: normalizedEmail,
          first_name: name?.firstName || "Demand Good",
          last_name: name?.lastName || "QA Member",
          skip_custom_fields_validation: true,
          send_welcome_email: true,
        },
      });
    }

    if (!user) {
      return { status: "error", error: "Could not find or create the Thinkific user." };
    }

    const enrollment = await thinkificRequest<ThinkificEnrollment>("/enrollments", {
      method: "POST",
      body: {
        user_id: user.id,
        course_id: Number(courseId),
        activated_at: new Date().toISOString(),
      },
    });

    if (!enrollment) {
      return { status: "error", error: "Thinkific did not confirm the enrollment." };
    }

    return { status: "enrolled" };
  } catch (error) {
    console.error("Thinkific fulfillment failed", error);
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
