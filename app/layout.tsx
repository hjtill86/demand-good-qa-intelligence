import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkPublishableKey, isClerkConfigured } from "../lib/clerk-config";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demand Good QA | Quality intelligence for modern brands",
  description: "Turn QA evidence into confident, faster decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isClerkConfigured()) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <ClerkProvider publishableKey={getClerkPublishableKey()} signInUrl="/login" signUpUrl="/login">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
