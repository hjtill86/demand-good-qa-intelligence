type ThinkificUser = {
  id: number;
  email: string;
};

type ThinkificEnrollment = {
  user_id: number;
  status?: string;
  expiry_date?: string | null;
};

type ThinkificCollection<T> = {
  items?: T[];
};

export type ThinkificAccessResult =
  | { status: "active"; email: string }
  | { status: "not-enrolled"; email: string }
  | { status: "not-configured"; email: string }
  | { status: "error"; email: string };

function getThinkificApiUrl(path: string) {
  const baseUrl = process.env.THINKIFIC_API_URL ?? "https://api.thinkific.com";
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/public/v1${path}`;
}

async function thinkificRequest<T>(path: string): Promise<T | null> {
  const url = getThinkificApiUrl(path);
  const apiKey = process.env.THINKIFIC_ADMIN_API_KEY;
  const subdomain = process.env.THINKIFIC_SUBDOMAIN;
  if (!url || !apiKey || !subdomain) {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      "X-Auth-API-Key": apiKey,
      "X-Auth-Subdomain": subdomain,
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    console.error(`Thinkific API request failed: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json() as Promise<T>;
}

export async function getThinkificAccess(email: string): Promise<ThinkificAccessResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    !process.env.THINKIFIC_ADMIN_API_KEY ||
    !process.env.THINKIFIC_SUBDOMAIN ||
    !getThinkificApiUrl("/users")
  ) {
    return { status: "not-configured", email: normalizedEmail };
  }

  try {
    const params = new URLSearchParams({
      "query[email]": normalizedEmail,
      limit: "1",
    });
    const users = await thinkificRequest<ThinkificCollection<ThinkificUser>>(`/users?${params}`);
    const user = users?.items?.[0];
    if (!user) {
      return { status: "not-enrolled", email: normalizedEmail };
    }

    const enrollments = await thinkificRequest<ThinkificCollection<ThinkificEnrollment>>(
      `/enrollments?user_id=${user.id}&limit=100`,
    );
    const hasActiveEnrollment = enrollments?.items?.some((enrollment) => {
      if (enrollment.status?.toLowerCase() !== "active") {
        return false;
      }
      return !enrollment.expiry_date || new Date(enrollment.expiry_date) > new Date();
    });

    return hasActiveEnrollment
      ? { status: "active", email: normalizedEmail }
      : { status: "not-enrolled", email: normalizedEmail };
  } catch (error) {
    console.error("Thinkific entitlement check failed", error);
    return { status: "error", email: normalizedEmail };
  }
}
