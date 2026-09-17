import { NextResponse } from "next/server";
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

  const { state } = createIntegrationState();
  const payload = {
    sub: process.env.THINKIFIC_SSO_CLIENT_ID,
    email: "member@demandgoodqa.com",
    name: "Demand Good QA Member",
    roles: ["member"],
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
    iat: Math.floor(Date.now() / 1000),
    state,
    redirect_to: redirectUri,
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
  authUrl.searchParams.set("return_to", redirectUri);
  authUrl.searchParams.set("error_url", `${getAppUrl()}/login`);

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
