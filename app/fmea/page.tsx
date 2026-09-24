import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";
import { FmeaGenerator } from "../components/fmea-generator";

export default function PublicFmeaPage() {
  return (
    <main>
      <nav className="nav container">
        <BrandLogo />
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/login">
            Member login <span>↗</span>
          </Link>
        </div>
      </nav>
      <section className="report-page">
        <header className="report-header">
          <span className="eyebrow">INTERACTIVE QUALITY TOOL</span>
          <h1>FMEA risk prioritization generator</h1>
          <p>
            Score potential failure modes by severity, occurrence, and detection. The Risk Priority
            Number (RPN) is S × O × D.
          </p>
        </header>
        <FmeaGenerator />
      </section>
    </main>
  );
}
