import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Demand Good QA | Quality intelligence for modern brands", description: "Turn QA evidence into confident, faster decisions." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
