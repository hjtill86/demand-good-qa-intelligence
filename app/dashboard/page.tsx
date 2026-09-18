import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { BrandLogo } from "../components/brand-logo";
import { getDashboardData } from "../../lib/dashboard-data";
import { getThinkificAccess } from "../../lib/thinkific-entitlements";

export default async function DashboardPage() {
  const user = await currentUser();
  const memberName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "Member";
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <BrandLogo />
          <div className="eyebrow">MEMBERSHIP REQUIRED</div>
          <h1>Connect your membership.</h1>
          <p>
            Sign in with the same email you use for your active Thinkific membership. Once the
            membership is found, your QA intelligence workspace will unlock.
          </p>
          {access.status === "not-configured" ? (
            <p className="fine-print">Thinkific enrollment verification is not configured yet.</p>
          ) : access.status === "error" ? (
            <p className="fine-print">We could not verify membership right now. Please try again shortly.</p>
          ) : (
            <p className="fine-print">No active Thinkific enrollment was found for {access.email}.</p>
          )}
          <a className="button button-dark full" href="/api/auth/thinkific">
            Open Thinkific member hub <span>→</span>
          </a>
        </div>
      </main>
    );
  }

  const { metrics, actions } = await getDashboardData();
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
          <a>Quality signals</a>
          <a>Regulatory watch</a>
          <a>Suppliers</a>
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
            <button className="date-button">Last 30 days⌄</button>
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
        </div>
      </section>
    </main>
  );
}
