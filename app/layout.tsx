import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkPublishableKey, isClerkConfigured } from "../lib/clerk-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demand Good QA | Quality intelligence for modern brands",
  description: "Turn QA evidence into confident, faster decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!isClerkConfigured()) {
    return content;
  }

  return <ClerkProvider publishableKey={getClerkPublishableKey()}>{content}</ClerkProvider>;
}
