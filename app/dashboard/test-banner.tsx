"use client";

import { useClerk } from "@clerk/nextjs";

export function TestBanner() {
  const { signOut } = useClerk();

  return (
    <div className="test-banner">
      <p>Test workspace. Records here stay off customer accounts. Checkout and login invitations still use the live site.</p>
      <button type="button" onClick={() => void signOut({ redirectUrl: "/login?redirect=/admin" })}>Exit test</button>
    </div>
  );
}
