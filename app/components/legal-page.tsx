import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main>
      <nav className="nav container">
        <BrandLogo />
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">
            Member login <span>↗</span>
          </Link>
        </div>
      </nav>
      <article className="report-page legal-doc">
        <header className="report-header">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </header>
        {children}
      </article>
    </main>
  );
}
