export type MemberSession = {
  name: string;
  email: string;
  role: string;
  provider: "demo" | "thinkific";
};

export function serializeMemberSession(session: MemberSession) {
  return encodeURIComponent(JSON.stringify(session));
}

export function parseMemberSession(rawValue?: string): MemberSession | null {
  if (!rawValue) return null;

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded) as Partial<MemberSession>;
    if (!parsed || typeof parsed.email !== "string" || typeof parsed.name !== "string") {
      return null;
    }

    return {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role ?? "member",
      provider: parsed.provider === "demo" || parsed.provider === "thinkific" ? parsed.provider : "demo",
    };
  } catch {
    return null;
  }
}

export function getMemberFromRequestCookies(cookieHeader?: string | null): MemberSession | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("dg_session="));

  if (!match) return null;

  const rawValue = match.split("=").slice(1).join("=");
  return parseMemberSession(rawValue);
}
