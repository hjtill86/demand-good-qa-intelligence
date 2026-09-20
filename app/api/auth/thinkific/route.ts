import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
