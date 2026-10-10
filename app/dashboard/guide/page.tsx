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
        <h2>5. Quality workbenches</h2>
        <p>
          These tools open from the sidebar. Saved entries stay with your account, including when you
          sign in on another computer. Approved documents, closed CAPAs, and signed supplier approvals
          stay on the register. Other changes keep the previous value in the audit trail.
        </p>
        <ul>
          <li><b>Review board</b> — KPIs, ISO 9001 clause 9.3 inputs, meeting minutes, outputs, and trend charts.</li>
          <li><b>CAPA / RCA</b> — corrective actions, 5-Why, fishbone, action tracker, and risk matrix.</li>
          <li><b>Audit readiness</b> — checklist, evidence register, nonconformance log, schedule, and contacts.</li>
          <li><b>SPC / MSA</b> — X-bar R, I-MR, Cp/Cpk, histogram, control rules, and Gage R&amp;R.</li>
          <li><b>Controlled documents</b> — SOPs, work instructions, policies, and forms. Approving a revision asks for your password and stores your name, the meaning “approval,” and the UTC time. Retired revisions stay. Downloaded files carry a confidential statement at the bottom.</li>
          <li><b>Training records</b> — who was trained on which revision, with the signed sheet attached. A new revision marks that training as due for retraining. The person does not need a login.</li>
          <li><b>Complaints and deviations</b> — record a complaint or a deviation and a CAPA opens with it. The CAPA stays open until the root cause, corrective action, and verification are saved and you sign the closure with your password. A closed CAPA stays on the register. Use CAPA / RCA for a 5-Why or fishbone, then write the result on the CAPA.</li>
          <li><b>Approved suppliers</b> — the supplier, what they are approved to supply, and the certificate with its expiration. Marking the file Approved asks for your password. That file then stays on the register. The certificate shows as expiring inside a 30, 60, or 90 day window, then as expired. Supplier risk scores on the overview are entered separately in Manage data.</li>
          <li><b>Audit trail</b> — each create, change, deletion, and signature on the registers above, with the person, the UTC time, and the previous value. Entries are added by the system and are not edited.</li>
          <li><b>Auditor packet</b> — one workbook of the document register, training records, complaints and CAPAs, approved suppliers, and the audit trail. Most Good also includes the license vault and supplier risk scores. It is a snapshot of those registers on the day you download it.</li>
          <li><b>Part 11 validation</b> — the written controls are on both plans. Most Good runs each test, saves what you saw and an optional file, and signs the revision with your password. That signed copy stays on the account. Signing it does not by itself make every record Part 11 compliant.</li>
        </ul>
        <p className="fine-print">Use ← Workspace on each tool to return to the overview. Available on both Foundation and Most Good.</p>
      </section>

      <section className="report-section">
        <h2>6. Generating a Quarterly Business Review (QBR)</h2>
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
        <h2>7. Using the Validation Control Center</h2>
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
            <h2>8. Logins (Most Good)</h2>
            <p>
              Most Good includes 5 logins, including the person who bought the subscription. Open <b>Logins</b> and add a colleague by email.
              That person signs in with their own email and sees the same company workspace. From Logins, add 5 more for $500 per month.
              Without that add-on, the sixth login is declined. Someone named on a training record does not need a login.
            </p>
          </section>

          <section className="report-section">
            <h2>9. Validating the site (Most Good)</h2>
            <ol className="wi-steps">
              <li>Open <b>Part 11 validation</b> and start revision 1.</li>
              <li>Run each test on the live site. Save Pass or Fail, write what you saw, and attach a screenshot or export when you have one.</li>
              <li>When every test is Pass, enter the password for your account and sign. Your name, the meaning approval, and the UTC time are stored.</li>
              <li>The signed revision stays on the account. A later software revision opens a new validation and leaves this one in place.</li>
            </ol>
            <p className="fine-print">Signing this package records that your account ran these tests. It does not by itself make every record Part 11 compliant.</p>
          </section>

          <section className="report-section">
            <h2>10. Using the License &amp; Certification Vault (Most Good)</h2>
            <ol className="wi-steps">
              <li>Select <b>License vault</b> from the sidebar to see every tracked company license and certification, its jurisdiction, reference number, expiration date, and status.</li>
              <li>Each record has a renewal alert lead time of 30, 60, or 90 days. When a license enters that window, it is flagged <b>Renewal due</b> or <b>Expiring soon</b> and appears in the Overview dashboard&apos;s alert card automatically — no manual check required.</li>
              <li>Work expiring items in order of soonest expiration date.</li>
              <li>Add each license or certification in <b>Manage data</b>. The vault stays empty until those records exist.</li>
              <li>Upload the PDF or image with the record, or from the File column in the vault. It stays stored until you replace it, remove it, or delete the record.</li>
            </ol>
          </section>

          <section className="report-section">
            <h2>11. Reading the Regulatory Watch feed (Most Good)</h2>
            <p>
              This feed is refreshed automatically about once an hour from official FDA (including
              MedWatch), CDC, NIH, WHO, CMS, DHS, Joint Commission, and NABP RSS feeds. Most state
              boards of pharmacy do not publish a dedicated public RSS feed, so state coverage uses
              NABP news, selected state government / health-department portals, and FDA MedWatch.
              Open <b>Regulatory radar</b> to filter by All updates, Federal alerts (FDA/CDC/WHO), or
              State portals & boards. Extra state-portal RSS URLs in <code>REGULATORY_EXTRA_FEEDS</code>
              are merged with the baseline registry at runtime. Each item shows the issuing agency, an
              impact estimate (High/Medium/Low), and a link to the original notice. Treat the impact
              rating as a starting point for your own review, not a final regulatory determination.
            </p>
          </section>
        </>
      ) : (
        <section className="report-section upsell-card">
          <h2>8. Unlock Most Good</h2>
          <p>
            Foundation includes your scorecard, trend, open actions, weekly digest, review generators,
            FMEA, and the Validation Control Center. Upgrading to <b>Most Good</b> adds Supplier Risk Intelligence, the License &amp;
            Certification Vault with renewal alerts, the live multi-agency Regulatory Watch feed, the Part 11 validation you run and sign, and up to 5 logins, with 5 more available for $500 per month.
          </p>
          <a className="button button-dark" href="/checkout?plan=most-good">Upgrade to Most Good <span>→</span></a>
        </section>
      )}

      <section className="report-section">
        <h2>{hasMostGood ? "12" : "9"}. Exporting your data</h2>
        <p>
          Use <b>Export Excel</b> on the Overview dashboard for a workbook of your metrics, actions, and
          weekly digest (plus Supplier Risk, License Vault, and Regulatory Watch sheets on Most Good). Use
          <b> Export PDF</b> for a print-ready version of the same data you can save or share. Use
          <b> Auditor packet</b> for one workbook of the document register, training records, complaints and CAPAs,
          approved suppliers, and the audit trail.
        </p>
      </section>

      <section className="report-section">
        <h2>{hasMostGood ? "13" : "10"}. Getting help</h2>
        <p>
          If your membership is not recognized, verify you signed in with the email used at checkout, then
          contact support from the Demand Good QA Intelligence site. This work instruction is generated from
          your live account, so it always reflects your current plan.
        </p>
      </section>
    </main>
  );
}
