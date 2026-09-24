import { currentUser } from "@clerk/nextjs/server";
import { getDgqiPlan } from "../../../lib/dgqi-entitlements";
import { PrintButton } from "../report/print-button";

export default async function WorkInstructionsPage() {
  const user = await currentUser();
  const hasMostGood = getDgqiPlan(user) === "most-good";

  return (
    <main className="report-page">
      <PrintButton />
      <header className="report-header">
        <span className="eyebrow">WORK INSTRUCTION · WI-DGQI-001</span>
        <h1>How to use Demand Good QA Intelligence</h1>
        <p className="fine-print">
          Current plan: <b>{hasMostGood ? "Most Good" : "Foundation"}</b>. Print or save this page as a
          PDF to give to new team members — it updates automatically as your plan or the product changes.
        </p>
      </header>

      <section className="report-section">
        <h2>1. Purpose and scope</h2>
        <p>
          This work instruction explains how a subscriber signs in, reads the daily quality pulse, uses
          the review generators, and (on Most Good) manages supplier risk, the live regulatory watch feed,
          and license/certification renewals. It applies to every Demand Good QA Intelligence subscriber.
        </p>
      </section>

      <section className="report-section">
        <h2>2. Signing in</h2>
        <ol className="wi-steps">
          <li>Go to the Demand Good QA Intelligence site and select <b>Member login</b>.</li>
          <li>Sign in or create an account with your DGQI account.</li>
          <li>Your authenticated DGQI account opens the workspace.</li>
          <li>You land on the <b>Overview</b> dashboard automatically. The DGQI app is where you work.</li>
        </ol>
      </section>

      <section className="report-section">
        <h2>3. Reading the Overview dashboard</h2>
        <table className="report-table">
          <thead><tr><th>Section</th><th>What it tells you</th><th>Included in</th></tr></thead>
          <tbody>
            <tr><td>Overall quality score / Compliant products / Open actions</td><td>Top-line scorecard for the current period, with the change versus the prior period.</td><td>Foundation + Most Good</td></tr>
            <tr><td>Quality trend chart</td><td>Seven-point trend line so you can see whether the score is improving or slipping.</td><td>Foundation + Most Good</td></tr>
            <tr><td>Open actions</td><td>Specific, prioritized corrective actions (High/Medium/Low) with a due date — work these top to bottom.</td><td>Foundation + Most Good</td></tr>
            <tr><td>Weekly decision digest</td><td>A plain-language summary of what changed this week and why, so you do not have to interpret raw numbers yourself.</td><td>Foundation + Most Good</td></tr>
            <tr><td>Supplier risk intelligence</td><td>Per-vendor risk score, trend arrow, and the specific open issue for each supplier.</td><td>Most Good only</td></tr>
            <tr><td>License &amp; certification alerts</td><td>Any license or certificate that is due for renewal or expiring soon.</td><td>Most Good only</td></tr>
            <tr><td>Regulatory watch</td><td>Live regulatory updates automatically pulled from FDA, CDC, CMS, Federal DHS, and The Joint Commission.</td><td>Most Good only</td></tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>4. Generating a Management Review</h2>
        <ol className="wi-steps">
          <li>From the sidebar or the Overview dashboard, select <b>Management review</b>.</li>
          <li>The page auto-fills your current quality scorecard, weekly performance highlights, and open corrective actions.</li>
          <li>Fill in the blank <b>Decisions, Resource needs, Improvement opportunities,</b> and <b>Next review date</b> fields during your meeting.</li>
          <li>Select <b>Print / Save as PDF</b> and choose &quot;Save as PDF&quot; in your browser&apos;s print dialog to keep a signed record.</li>
        </ol>
        <p className="fine-print">Available on both Foundation and Most Good.</p>
      </section>

      <section className="report-section">
        <h2>5. Generating a Quarterly Business Review (QBR)</h2>
        <ol className="wi-steps">
          <li>Select <b>Quarterly review</b> from the sidebar or the Overview dashboard.</li>
          <li>Review the executive scorecard, quarter-in-review summary, and priority risks/commitments table.</li>
          <li>Most Good members also see the supplier performance table for the quarter.</li>
          <li>Complete the <b>Next-quarter commitments</b> section with your team&apos;s top priorities, resourcing decisions, and owners.</li>
          <li>Print or save the page as a PDF to share with leadership.</li>
        </ol>
        <p className="fine-print">Available on both Foundation and Most Good.</p>
      </section>

      <section className="report-section">
        <h2>6. Using the Validation Control Center</h2>
        <ol className="wi-steps">
          <li>From the sidebar or Overview, select <b>Validation suite</b>.</li>
          <li>On <b>IQ/OQ/PQ generator</b>, enter the system name, choose IQ, OQ, or PQ, describe the test objective, then compile the protocol.</li>
          <li>Use <b>Validation KPI tracker</b> to log pass/fail execution against a protocol reference and review first-pass yield and open deviations.</li>
        </ol>
        <p className="fine-print">Available on both Foundation and Most Good.</p>
      </section>

      {hasMostGood ? (
        <>
          <section className="report-section">
            <h2>7. Using the License &amp; Certification Vault (Most Good)</h2>
            <ol className="wi-steps">
              <li>Select <b>License vault</b> from the sidebar to see every tracked company license and certification, its jurisdiction, reference number, expiration date, and status.</li>
              <li>Each record has a renewal alert lead time of 30, 60, or 90 days. When a license enters that window, it is flagged <b>Renewal due</b> or <b>Expiring soon</b> and appears in the Overview dashboard&apos;s alert card automatically — no manual check required.</li>
              <li>Work expiring items in order of soonest expiration date.</li>
              <li>Records currently shown are sample data pending a document-storage integration; contact support to add your company&apos;s real licenses and certifications.</li>
            </ol>
          </section>

          <section className="report-section">
            <h2>8. Reading the Regulatory Watch feed (Most Good)</h2>
            <p>
              This feed is refreshed automatically about once an hour from official FDA (including
              MedWatch), CDC, NIH, WHO, CMS, DHS, Joint Commission, and NABP RSS feeds. Most state
              boards of pharmacy do not publish a dedicated public RSS feed, so state coverage uses
              NABP news, selected state government / health-department portals, and FDA MedWatch.
              Open <b>Regulatory radar</b> to filter by FDA, CDC/NIH, WHO, or state portals. Each item
              shows the issuing agency, an impact estimate (High/Medium/Low), and a link to the original
              notice. Treat the impact rating as a starting point for your own review, not a final
              regulatory determination.
            </p>
          </section>
        </>
      ) : (
        <section className="report-section upsell-card">
          <h2>7. Unlock Most Good</h2>
          <p>
            Foundation includes your scorecard, trend, open actions, weekly digest, review generators,
            FMEA, and the Validation Control Center. Upgrading to <b>Most Good</b> adds Supplier Risk Intelligence, the License &amp;
            Certification Vault with renewal alerts, and the live multi-agency Regulatory Watch feed.
          </p>
          <a className="button button-dark" href="/checkout?plan=most-good">Upgrade to Most Good <span>→</span></a>
        </section>
      )}

      <section className="report-section">
        <h2>{hasMostGood ? "9" : "8"}. Exporting your data</h2>
        <p>
          Use <b>Export Excel</b> on the Overview dashboard for a workbook of your metrics, actions, and
          weekly digest (plus Supplier Risk, License Vault, and Regulatory Watch sheets on Most Good). Use
          <b> Export PDF</b> for a print-ready version of the same data you can save or share.
        </p>
      </section>

      <section className="report-section">
        <h2>{hasMostGood ? "10" : "9"}. Getting help</h2>
        <p>
          If your membership is not recognized, verify you signed in with the email used at checkout, then
          contact support from the Demand Good QA Intelligence site. This work instruction is generated from
          your live account, so it always reflects your current plan.
        </p>
      </section>
    </main>
  );
}
