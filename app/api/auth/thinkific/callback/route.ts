import { NextResponse } from "next/server";
import { serializeMemberSession } from "../../../../../lib/auth-session";
import { getThinkificStatus, parseJwtPayload, verifyThinkificJwt } from "../../../../../lib/integration-config";

export async function GET(request: Request) {
  const thinkificStatus = getThinkificStatus();
  const url = new URL(request.url);
  const jwt = url.searchParams.get("jwt");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const expectedState = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("dg_auth_state="))
    ?.split("=")[1];

  if (!thinkificStatus.configured) {
    return NextResponse.json(
      {
        status: "placeholder",
        message: "Thinkific SSO callback is not enabled in this MVP.",
        configured: false,
        requiredConfiguration: thinkificStatus.requiredVariables,
        callback: {
          code: code ?? null,
          jwt: jwt ? "present" : null,
          state: state ?? null,
        },
        nextStep:
          "Validate the Thinkific JWT payload and state, map the member to an application account, and set a secure dg_session cookie only after the provider is configured.",
      },
      { status: 501 }
    );
  }

  if ((!jwt && !code) || !state || !expectedState || state !== expectedState) {
    return NextResponse.json(
      {
        status: "error",
        message: "The Thinkific callback is missing a valid JWT or state value.",
        callback: {
          code: code ?? null,
          jwt: jwt ? "present" : null,
          state: state ?? null,
        },
      },
      { status: 400 }
    );
  }

  const verifiedPayload = jwt ? verifyThinkificJwt(jwt) : null;
  const decodedPayload = jwt ? parseJwtPayload(jwt.split(".")[1]) : null;
  const memberName =
    verifiedPayload?.name ||
    [verifiedPayload?.first_name, verifiedPayload?.last_name].filter(Boolean).join(" ") ||
    decodedPayload?.name ||
    [decodedPayload?.first_name, decodedPayload?.last_name].filter(Boolean).join(" ") ||
    decodedPayload?.full_name ||
    decodedPayload?.user?.name ||
    "Demand Good QA Member";
  const memberEmail =
    verifiedPayload?.email ??
    decodedPayload?.email ??
    decodedPayload?.user?.email ??
    decodedPayload?.sub ??
    `member-${Date.now()}@demandgoodqa.local`;

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(
    "dg_session",
    serializeMemberSession({
      name: String(memberName),
      email: String(memberEmail),
      role: "member",
      provider: "thinkific",
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    }
  );
  response.cookies.set("dg_auth_state", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
