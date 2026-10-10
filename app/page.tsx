import Link from "next/link";
import { BrandLogo } from "./components/brand-logo";
import { stripePlans } from "../lib/integration-config";

const features = [
  ["01", "Keep the quality record", "Controlled documents, training, complaints, CAPAs, and supplier certificates stay on the account until you change them."],
  ["02", "Hand an auditor one packet", "Download the document register, training, CAPAs, and approved suppliers as one workbook, dated that day."],
  ["03", "See what needs attention", "Scores, open actions, expiring certificates, and, on Most Good, the live regulatory radar."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav container">
        <BrandLogo />
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <Link href="/fmea">FMEA tool</Link>
          <a href="#pricing">Pricing</a>
          <Link href="/login">
            Member login <span>↗</span>
          </Link>
        </div>
      </nav>

      <section className="hero container">
        <div className="eyebrow">QUALITY INTELLIGENCE, WITHOUT THE NOISE</div>
        <h1>
          Make every <em>good</em>
          <br />
          decision count.
        </h1>
        <p className="hero-copy">
          Demand Good QA keeps the daily quality pulse, controlled documents, training, complaints,
          and supplier certificates in one workspace.
        </p>
        <div className="hero-actions">
          <Link className="button button-dark" href="/checkout?plan=foundation">
            Start with Foundation <span>→</span>
          </Link>
          <a className="text-link" href="#pricing">
            See plans <span>↓</span>
          </a>
        </div>
        <div className="hero-note">
          <span className="pulse" /> Built for quality, regulatory, and operations leaders.
        </div>
      </section>

      <section className="signal-strip">
        <div className="container signal-content">
          <span>ONE VIEW FOR THE SIGNALS THAT MATTER</span>
          <div className="signal-items">
            <span>
              QA <b>↗</b>
            </span>
            <span>
              REGULATORY <b>↗</b>
            </span>
            <span>
              SUPPLY <b>↗</b>
            </span>
            <span>
              IMPACT <b>↗</b>
            </span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="features container">
        <div className="section-intro">
          <div className="eyebrow">THE GOOD STANDARD</div>
          <h2>
            Clarity is a
            <br />
            <em>quality</em> feature.
          </h2>
        </div>
        <div className="feature-list">
          {features.map(([number, title, body]) => (
            <article className="feature" key={number}>
              <span className="feature-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <span className="feature-arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="preview-wrap">
        <div className="container">
          <div className="dashboard-preview">
            <div className="preview-top">
              <span className="mini-brand">Demand Good QA</span>
              <span className="preview-label">
                DASHBOARD PREVIEW <span className="pulse" />
              </span>
            </div>
            <div className="preview-main">
              <div>
                <div className="eyebrow">SAMPLE OVERVIEW</div>
                <h2>
                  Your quality pulse
                  <br />
                  <em>looks good.</em>
                </h2>
                <p>3 items need your attention this week.</p>
              </div>
              <div className="score-card">
                <span>OVERALL SCORE</span>
                <strong>
                  87<small>/100</small>
                </strong>
                <div className="score-bar">
                  <i />
                </div>
                <small>↑ 6% from last week</small>
              </div>
            </div>
            <div className="mini-cards">
              <div>
                <span>OPEN ACTIONS</span>
                <b>12</b>
              </div>
              <div>
                <span>COMPLIANT ITEMS</span>
                <b>94%</b>
              </div>
              <div>
                <span>SUPPLIER HEALTH</span>
                <b>Good</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing container">
        <div className="eyebrow">SIMPLE, SERIOUS PRICING</div>
        <h2>
          Start making better
          <br />
          <em>decisions today.</em>
        </h2>
        <div className="price-grid">
          <div className="price-card">
            <span className="tag">FOUNDATION</span>
            <h3>For focused teams</h3>
            <div className="price">
              ${stripePlans.foundation.amount.toFixed(2)} <small>/ month</small>
            </div>
            <p>One clear view of the quality signals that keep your team moving.</p>
            <ul>
              <li>Quality dashboard and weekly digest</li>
              <li>Controlled documents and training records</li>
              <li>Complaints, deviations, and CAPAs</li>
              <li>Approved supplier files</li>
              <li>Auditor packet and validation suite</li>
            </ul>
            <Link className="button button-outline" href="/checkout?plan=foundation">
              Start with Foundation →
            </Link>
          </div>

          <div className="price-card featured">
            <span className="tag">MOST GOOD</span>
            <h3>For growing operations</h3>
            <div className="price">
              ${stripePlans["most-good"].amount.toFixed(2)} <small>/ month</small>
            </div>
            <p>Deeper context, shared accountability, and the confidence to scale.</p>
            <ul>
              <li>Everything in Foundation</li>
              <li>License and certification vault</li>
              <li>Live regulatory radar</li>
              <li>Supplier risk scores</li>
              <li>5 logins, plus 5 more for $500/month</li>
            </ul>
            <Link className="button button-light" href="/checkout?plan=most-good">
              Choose Most Good →
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div>
            <BrandLogo className="footer-logo" />
            <p>Better systems for better goods.</p>
          </div>
          <div className="footer-links">
            <Link href="/login">Member login</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <a href="mailto:htillman@demandgoodqa.com">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
