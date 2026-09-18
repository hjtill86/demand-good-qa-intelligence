import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "../../../lib/dashboard-data";
import { getThinkificAccess } from "../../../lib/thinkific-entitlements";
import { PrintButton } from "../report/print-button";

export default async function QuarterlyBusinessReviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    redirect("/dashboard");
  }

  const { metrics, actions, weeklyDigest, supplierRisk } = await getDashboardData();
  const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;

  return (
    <main className="report-page">
      <PrintButton />
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Quarterly business review</h1>
        <p className="fine-print">
          {quarter} executive quality and compliance review. Print or save this page as a PDF after adding the meeting outcomes.
        </p>
      </header>

      <section className="report-section">
        <h2>1. Executive scorecard</h2>
        <table className="report-table">
          <tbody>
            <tr><td>Overall quality score</td><td>{metrics.qualityScore}/100</td></tr>
            <tr><td>Compliant products</td><td>{metrics.compliantProducts}%</td></tr>
            <tr><td>Open actions</td><td>{metrics.openActions}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>2. Quarter in review</h2>
        <p><b>{weeklyDigest.headline}</b></p>
        <p>{weeklyDigest.summary}</p>
        <ul>
          {weeklyDigest.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </section>

      <section className="report-section">
        <h2>3. Priority risks and commitments</h2>
        <table className="report-table">
          <thead><tr><th>Risk</th><th>Commitment</th><th>Owner / context</th><th>Timing</th></tr></thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.title}>
                <td>{action.level}</td><td>{action.title}</td><td>{action.detail}</td><td>{action.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>4. Supplier performance</h2>
        <table className="report-table">
          <thead><tr><th>Supplier</th><th>Category</th><th>Risk score</th><th>Trend</th></tr></thead>
          <tbody>
            {supplierRisk.map((supplier) => (
              <tr key={supplier.name}>
                <td>{supplier.name}</td><td>{supplier.category}</td><td>{supplier.score}/100</td><td>{supplier.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>5. Next-quarter commitments</h2>
        <div className="review-notes">
          <p><b>Top three priorities:</b></p>
          <p><b>Investment / resource decisions:</b></p>
          <p><b>Owners and milestones:</b></p>
        </div>
      </section>
    </main>
  );
}
