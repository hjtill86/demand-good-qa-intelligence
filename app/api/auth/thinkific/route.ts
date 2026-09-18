import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createIntegrationState, createThinkificJwt, getAppUrl, getThinkificStatus } from "../../../../lib/integration-config";

export async function GET(request: Request) {
  const thinkificStatus = getThinkificStatus();
  const redirectUri = process.env.THINKIFIC_SSO_REDIRECT_URI ?? `${getAppUrl()}/api/auth/thinkific/callback`;

  if (!thinkificStatus.configured) {
    return NextResponse.json(
      {
        status: "placeholder",
        message: "Thinkific SSO is not enabled in this MVP.",
        configured: false,
        requiredConfiguration: thinkificStatus.requiredVariables,
        redirectUri,
        nextStep:
          "Add your Thinkific SSO URL, client ID, client secret, and redirect URI in .env.local or Vercel, then sign the provider payload and redirect the member to the Thinkific JWT endpoint.",
      },
      { status: 501 }
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    // Not signed in to Demand Good QA yet — send them to Clerk login first so
    // the Thinkific handoff always carries a real, authenticated identity.
    const loginUrl = new URL("/login", getAppUrl());
    loginUrl.searchParams.set("redirect", "/api/auth/thinkific");
    return NextResponse.redirect(loginUrl.toString());
  }

  const { state } = createIntegrationState();
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("state", state);
  const payload = {
    email,
    first_name: user?.firstName ?? "",
    last_name: user?.lastName ?? "",
    external_source: "demand-good-qa",
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = createThinkificJwt(payload);
  if (!jwt) {
    return NextResponse.json(
      {
        status: "error",
        message: "Thinkific SSO is missing the required client secret.",
      },
      { status: 500 }
    );
  }

  const baseUrl = (process.env.THINKIFIC_SSO_URL ?? "").replace(/\/+$/, "");
  const authUrl = new URL(`${baseUrl}/api/sso/v2/sso/jwt`);
  authUrl.searchParams.set("jwt", jwt);
  authUrl.searchParams.set("return_to", callbackUrl.toString());
  authUrl.searchParams.set("error_url", `${getAppUrl().replace(/\/+$/, "")}/login`);

  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set("dg_auth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
