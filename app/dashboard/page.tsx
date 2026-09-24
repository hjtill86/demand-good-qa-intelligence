import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { BrandLogo } from "../components/brand-logo";
import { getDashboardData } from "../../lib/dashboard-data";
import { getDgqiPlan } from "../../lib/dgqi-entitlements";
import { getRegulatoryWatchFeed } from "../../lib/regulatory-feed";

export default async function DashboardPage() {
  const user = await currentUser();
  const memberName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "Member";
  const {
    metrics,
    actions,
    weeklyDigest,
    supplierRisk,
    regulatoryWatch: mockRegulatoryWatch,
    licenseRecords,
  } = await getDashboardData();
  const plan = getDgqiPlan(user);
  const hasMostGood = plan === "most-good";
  const liveRegulatoryWatch = hasMostGood ? await getRegulatoryWatchFeed(8) : [];
  const usingLiveFeed = liveRegulatoryWatch.length > 0;
  const initials = memberName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "M";

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <BrandLogo className="sidebar-logo" />
        <div className="side-section">
          <span>WORKSPACE</span>
          <a className="active">Overview</a>
          <a href="/dashboard/management-review">Management review</a>
          <a href="/dashboard/quarterly-business-review">Quarterly review</a>
          <a href="/dashboard/fmea">FMEA generator</a>
          <a href="/dashboard/validation">Validation suite</a>
          <a href="/dashboard/data">Manage data</a>
          {hasMostGood ? <a href="/dashboard/licenses">License vault</a> : null}
          {hasMostGood ? <a href="/dashboard/regulatory">Regulatory radar</a> : null}
          <a href="/dashboard/guide">How to use (work instruction)</a>
        </div>
        <div className="side-bottom">
          <a>Settings</a>
          <div className="user-chip">
            <span>{initials}</span>
            <div>
              <b>{memberName}</b>
              <small>Clerk member</small>
            </div>
          </div>
        </div>
      </aside>
      <section className="dash-content">
        <header className="dash-header">
          <div>
            <span className="eyebrow">TUESDAY, SEPTEMBER 17, 2026</span>
            <h1>Good morning, {memberName.split(" ")[0]}.</h1>
          </div>
          <UserButton />
        </header>
        <div className="dash-body">
          <div className="dash-intro">
            <div>
              <h2>Your quality pulse <em>looks good.</em></h2>
              <p>Here’s what deserves your attention this week.</p>
            </div>
            <div className="dash-intro-actions">
              <a className="outline-small" href="/api/dashboard/export/excel">Export Excel</a>
              <a className="outline-small" href="/dashboard/report" target="_blank" rel="noreferrer">Export PDF</a>
              <button className="date-button">Last 30 days⌄</button>
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <span>OVERALL QUALITY SCORE</span>
              <strong>{metrics.qualityScore}<small>/100</small></strong>
              <b className="positive">↑ {metrics.qualityScoreChange} <i>vs last period</i></b>
            </div>
            <div className="metric-card">
              <span>COMPLIANT PRODUCTS</span>
              <strong>{metrics.compliantProducts}<small>%</small></strong>
              <b className="positive">↑ {metrics.compliantProductsChange} <i>vs last period</i></b>
            </div>
            <div className="metric-card">
              <span>OPEN ACTIONS</span>
              <strong>{metrics.openActions}</strong>
              <b className="neutral">{metrics.actionsDue} due this week</b>
            </div>
          </div>
          <div className="chart-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">QUALITY TREND</span>
                <h3>Steady progress, fewer surprises.</h3>
              </div>
              <span className="legend"><i /> Quality score</span>
            </div>
            <div className="chart">
              <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
              <svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Quality score trending upward from 72 to 87">
                <path className="grid-line" d="M0 10H700M0 55H700M0 100H700M0 145H700M0 185H700" />
                <path className="area" d="M0 120 C70 125 85 98 145 108 S220 78 280 92 S350 105 410 70 S480 80 530 48 S620 52 700 30 V190 H0Z" />
                <path className="line" d="M0 120 C70 125 85 98 145 108 S220 78 280 92 S350 105 410 70 S480 80 530 48 S620 52 700 30" />
                <circle cx="700" cy="30" r="5" />
              </svg>
            </div>
            <div className="chart-x"><span>Aug 19</span><span>Aug 26</span><span>Sep 02</span><span>Sep 09</span><span>Sep 17</span></div>
          </div>
          <div className="actions-card">
            <div className="card-heading">
              <div><span className="eyebrow">NEEDS ATTENTION</span><h3>Open actions</h3></div>
              <a>View all →</a>
            </div>
            {actions.map((action) => (
              <div className="action-row" key={action.title}>
                <i className={`risk ${action.level.toLowerCase()}`} />
                <div><b>{action.title}</b><span>{action.detail}</span></div>
                <span className="due">{action.due}</span><span>→</span>
              </div>
            ))}
          </div>
          <div className="actions-card">
            <div className="card-heading">
              <div><span className="eyebrow">FOUNDATION + MOST GOOD</span><h3>Weekly decision digest</h3></div>
            </div>
            <p className="digest-headline"><b>{weeklyDigest.headline}</b></p>
            <p>{weeklyDigest.summary}</p>
            <ul className="digest-list">
              {weeklyDigest.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className="generator-grid">
            <a className="generator-card" href="/dashboard/management-review">
              <span className="eyebrow">FOUNDATION + MOST GOOD</span>
              <h3>Management review generator</h3>
              <p>Prepare a structured quality-management review with current scorecards, risks, and decision fields.</p>
              <b>Generate review →</b>
            </a>
            <a className="generator-card" href="/dashboard/quarterly-business-review">
              <span className="eyebrow">FOUNDATION + MOST GOOD</span>
              <h3>Quarterly business review generator</h3>
              <p>Create an executive-ready quarterly snapshot of performance, commitments, and supplier trends.</p>
              <b>Generate review →</b>
            </a>
            <a className="generator-card" href="/dashboard/fmea">
              <span className="eyebrow">FOUNDATION + MOST GOOD</span>
              <h3>FMEA risk generator</h3>
              <p>Prioritize failure modes with severity, occurrence, detection, and an automatic Risk Priority Number.</p>
              <b>Open generator →</b>
            </a>
            <a className="generator-card" href="/dashboard/validation">
              <span className="eyebrow">FOUNDATION + MOST GOOD</span>
              <h3>Validation control center</h3>
              <p>Compile IQ/OQ/PQ protocols and track first-pass yield, deviations, and execution results.</p>
              <b>Open suite →</b>
            </a>
            <a className="generator-card" href="/dashboard/guide">
              <span className="eyebrow">FOUNDATION + MOST GOOD</span>
              <h3>Work instruction &amp; guide</h3>
              <p>Step-by-step instructions for using every feature of your subscription — printable for new team members.</p>
              <b>Open guide →</b>
            </a>
          </div>
          {hasMostGood ? (
            <>
              <div className="actions-card">
                <div className="card-heading">
                  <div><span className="eyebrow">MOST GOOD · RENEWAL CONTROL</span><h3>License & certification alerts</h3></div>
                  <a href="/dashboard/licenses">Open license vault →</a>
                </div>
                {licenseRecords.filter((record) => record.status !== "Current").map((record) => (
                  <div className="action-row" key={record.licenseNumber}>
                    <i className={`risk ${record.status === "Renewal due" ? "high" : "medium"}`} />
                    <div>
                      <b>{record.company} — {record.documentName}</b>
                      <span>{record.jurisdiction} · expires {record.expiresOn} · {record.renewalLeadDays}-day alert rule</span>
                    </div>
                    <span className="due">{record.status}</span>
                    <span>→</span>
                  </div>
                ))}
              </div>
              <div className="actions-card">
                <div className="card-heading">
                  <div><span className="eyebrow">MOST GOOD</span><h3>Supplier risk intelligence</h3></div>
                  <a>View all suppliers →</a>
                </div>
                {supplierRisk.map((supplier) => (
                  <div className="action-row" key={supplier.name}>
                    <i
                      className={`risk ${supplier.score >= 80 ? "low" : supplier.score >= 65 ? "medium" : "high"}`}
                    />
                    <div>
                      <b>{supplier.name}</b>
                      <span>{supplier.category} · {supplier.note}</span>
                    </div>
                    <span className="due">{supplier.score}/100</span>
                    <span>{supplier.trend === "up" ? "↑" : supplier.trend === "down" ? "↓" : "→"}</span>
                  </div>
                ))}
              </div>
              <div className="actions-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">MOST GOOD · FDA · CDC · CMS · DHS · TJC</span>
                    <h3>Regulatory watch{usingLiveFeed ? " (live)" : ""}</h3>
                  </div>
                  <a href="/dashboard/regulatory">Open full RSS radar →</a>
                </div>
                {!usingLiveFeed ? (
                  <p className="fine-print" style={{ margin: "0 0 8px" }}>
                    Live agency feeds were unavailable when this page loaded; showing sample data.
                  </p>
                ) : null}
                {(usingLiveFeed ? liveRegulatoryWatch : mockRegulatoryWatch).map((item) => (
                  <div className="action-row" key={item.title}>
                    <i className={`risk ${item.impact.toLowerCase()}`} />
                    <div>
                      <b>
                        {"agency" in item ? `[${item.agency}] ` : ""}
                        {"link" in item && item.link ? (
                          <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
                        ) : (
                          item.title
                        )}
                      </b>
                      <span>{item.jurisdiction} · {item.summary}</span>
                    </div>
                    <span className="due">
                      {"publishedAt" in item ? new Date(item.publishedAt).toLocaleDateString() : item.effectiveDate}
                    </span>
                    <span>→</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="actions-card upsell-card">
              <div className="card-heading">
                <div><span className="eyebrow">UPGRADE AVAILABLE</span><h3>Unlock Most Good</h3></div>
              </div>
              <p>
                Add supplier risk intelligence across every vendor and a live regulatory watch feed
                automatically pulled from FDA, CDC, CMS, DHS, and The Joint Commission — plus
                unlimited team members.
              </p>
              <a className="button button-dark" href="/checkout?plan=most-good">
                Upgrade to Most Good <span>→</span>
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
