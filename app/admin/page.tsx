import { requireAdmin } from "../../lib/admin-access";
import { findAccount, listRecentAccounts } from "../../lib/admin-accounts";
import { AdminConsole } from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const access = await requireAdmin();
  if (!access.ok) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>This page is not available.</h1>
        </div>
      </main>
    );
  }

  const email = ((await searchParams)?.email ?? "").trim();
  const recent = await listRecentAccounts().catch(() => []);
  const lookup = email ? await findAccount(email).catch(() => ({ ok: false as const, error: "Could not load that account.", status: 500 as const })) : null;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">ADMIN</span>
        <h1>Account support</h1>
        <p className="fine-print">
          Signed in as {access.email}. Look up a subscriber, then change plan access or logins.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <section className="report-section">
        <form className="data-form" action="/admin" method="get">
          <h2>Look up an account</h2>
          <div className="data-form-grid">
            <label>
              <span>Email</span>
              <input type="email" name="email" defaultValue={email} placeholder="subscriber@company.com" required />
            </label>
          </div>
          <button className="button button-dark" type="submit">Look up</button>
        </form>
        {lookup && !lookup.ok ? <p className="fine-print" role="status">{lookup.error}</p> : null}
        {lookup?.ok ? <AdminConsole account={lookup.account} /> : null}
      </section>
      <section className="report-section">
        <h2>Recent accounts</h2>
        {recent.length === 0 ? <p className="fine-print">No accounts to show.</p> : (
          <table className="report-table">
            <thead><tr><th>Email</th><th>Name</th><th>Plan</th><th>Created</th></tr></thead>
            <tbody>
              {recent.map((account) => (
                <tr key={account.userId}>
                  <td><a href={`/admin?email=${encodeURIComponent(account.email)}`}>{account.email || account.userId}</a></td>
                  <td>{account.name}</td>
                  <td>{account.plan === "most-good" ? "Most Good" : "Foundation"}</td>
                  <td>{account.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
