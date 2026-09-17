import { NextResponse } from "next/server";
import { serializeMemberSession } from "../../../../lib/auth-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") ?? "/dashboard";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  response.cookies.set(
    "dg_session",
    serializeMemberSession({
      name: "Alex Lee",
      email: "alex@demandgoodqa.local",
      role: "member",
      provider: "demo",
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    }
  );

  return response;
}
