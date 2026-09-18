import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "../../../lib/dashboard-data";
import { getThinkificAccess } from "../../../lib/thinkific-entitlements";
import { getRegulatoryWatchFeed } from "../../../lib/regulatory-feed";
import { PrintButton } from "./print-button";

export default async function DashboardReportPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    redirect("/dashboard");
  }

  const hasMostGood = access.plan === "most-good";
  const {
    metrics,
    actions,
    weeklyDigest,
    supplierRisk,
    regulatoryWatch: mockRegulatoryWatch,
    licenseRecords,
  } = await getDashboardData();
  const liveRegulatoryWatch = hasMostGood ? await getRegulatoryWatchFeed() : [];
  const regulatoryRows = liveRegulatoryWatch.length > 0 ? liveRegulatoryWatch : mockRegulatoryWatch;
  const usingLiveFeed = liveRegulatoryWatch.length > 0;

  return (
    <main className="report-page">
      <PrintButton />
      <header className="report-header">
        <span className="eyebrow">DEMAND GOOD QA INTELLIGENCE</span>
        <h1>Quality &amp; regulatory intelligence report</h1>
        <p className="fine-print">
          Generated {new Date().toLocaleString()} for {email}. Use your browser&apos;s
          print dialog and choose &quot;Save as PDF&quot; to keep a copy.
        </p>
      </header>

      <section className="report-section">
        <h2>Overview</h2>
        <table className="report-table">
          <tbody>
            <tr><td>Overall quality score</td><td>{metrics.qualityScore}/100 ({metrics.qualityScoreChange})</td></tr>
            <tr><td>Compliant products</td><td>{metrics.compliantProducts}% ({metrics.compliantProductsChange})</td></tr>
            <tr><td>Open actions</td><td>{metrics.openActions} ({metrics.actionsDue} due this week)</td></tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>Weekly decision digest</h2>
        <p><b>{weeklyDigest.headline}</b></p>
        <p>{weeklyDigest.summary}</p>
        <ul>
          {weeklyDigest.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="report-section">
        <h2>Open actions</h2>
        <table className="report-table">
          <thead><tr><th>Risk</th><th>Title</th><th>Detail</th><th>Due</th></tr></thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.title}>
                <td>{action.level}</td>
                <td>{action.title}</td>
                <td>{action.detail}</td>
                <td>{action.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {hasMostGood ? (
        <>
          <section className="report-section">
            <h2>Supplier risk intelligence</h2>
            <table className="report-table">
              <thead><tr><th>Supplier</th><th>Category</th><th>Score</th><th>Trend</th><th>Note</th></tr></thead>
              <tbody>
                {supplierRisk.map((supplier) => (
                  <tr key={supplier.name}>
                    <td>{supplier.name}</td>
                    <td>{supplier.category}</td>
                    <td>{supplier.score}/100</td>
                    <td>{supplier.trend}</td>
                    <td>{supplier.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="report-section">
            <h2>License &amp; certification renewal control</h2>
            <table className="report-table">
              <thead><tr><th>Company</th><th>Document</th><th>Reference</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {licenseRecords.map((record) => (
                  <tr key={record.licenseNumber}>
                    <td>{record.company}</td>
                    <td>{record.documentName}</td>
                    <td>{record.licenseNumber}</td>
                    <td>{record.expiresOn}</td>
                    <td>{record.status} ({record.renewalLeadDays}-day alert)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="report-section">
            <h2>Regulatory watch{usingLiveFeed ? " — live feed" : " — sample data"}</h2>
            <p className="fine-print">
              Automatically monitored: FDA, CDC, CMS, Federal DHS, and The Joint Commission. ISO and
              state-specific agencies (State Departments of Health, State Boards of Pharmacy) require
              adding their feed URLs via the <code>REGULATORY_EXTRA_FEEDS</code> environment variable,
              since no single public feed covers every state. Impact levels are an automated keyword
              estimate, not a formal regulatory determination.
            </p>
            <table className="report-table">
              <thead><tr><th>Agency/Jurisdiction</th><th>Title</th><th>Impact</th><th>Date</th><th>Summary</th></tr></thead>
              <tbody>
                {regulatoryRows.map((item) => (
                  <tr key={item.title}>
                    <td>{"agency" in item ? item.agency : item.jurisdiction}</td>
                    <td>{item.title}</td>
                    <td>{item.impact}</td>
                    <td>{"publishedAt" in item ? new Date(item.publishedAt).toLocaleDateString() : item.effectiveDate}</td>
                    <td>{item.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
