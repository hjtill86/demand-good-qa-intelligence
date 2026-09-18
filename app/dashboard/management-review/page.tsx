import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "../../../lib/dashboard-data";
import { getThinkificAccess } from "../../../lib/thinkific-entitlements";
import { PrintButton } from "../report/print-button";

export default async function ManagementReviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    redirect("/dashboard");
  }

  const { metrics, actions, weeklyDigest } = await getDashboardData();
  const reviewDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="report-page">
      <PrintButton />
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Management review</h1>
        <p className="fine-print">
          Prepared {reviewDate}. Review, add meeting decisions, then print or save this page as a PDF.
        </p>
      </header>

      <section className="report-section">
        <h2>1. Quality management system performance</h2>
        <table className="report-table">
          <tbody>
            <tr><td>Overall quality score</td><td>{metrics.qualityScore}/100 ({metrics.qualityScoreChange} vs. last period)</td></tr>
            <tr><td>Compliant products</td><td>{metrics.compliantProducts}% ({metrics.compliantProductsChange} vs. last period)</td></tr>
            <tr><td>Open actions</td><td>{metrics.openActions}; {metrics.actionsDue} due this week</td></tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>2. Performance highlights and changes</h2>
        <p><b>{weeklyDigest.headline}</b></p>
        <p>{weeklyDigest.summary}</p>
        <ul>
          {weeklyDigest.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </section>

      <section className="report-section">
        <h2>3. Corrective actions and risk</h2>
        <table className="report-table">
          <thead><tr><th>Risk</th><th>Action</th><th>Detail</th><th>Due</th></tr></thead>
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
        <h2>4. Management decisions and resources</h2>
        <div className="review-notes">
          <p><b>Decisions / actions:</b></p>
          <p><b>Resource needs:</b></p>
          <p><b>Improvement opportunities:</b></p>
          <p><b>Next review date:</b></p>
        </div>
      </section>
    </main>
  );
}
