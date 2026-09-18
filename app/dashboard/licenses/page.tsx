import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "../../../lib/dashboard-data";
import { getThinkificAccess } from "../../../lib/thinkific-entitlements";

function statusClass(status: "Current" | "Renewal due" | "Expiring soon") {
  return status === "Current" ? "license-current" : status === "Renewal due" ? "license-due" : "license-soon";
}

export default async function LicensesPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    redirect("/dashboard");
  }

  if (access.plan !== "most-good") {
    redirect("/checkout?plan=most-good");
  }

  const { licenseRecords } = await getDashboardData();
  const renewalRecords = licenseRecords.filter((record) => record.status !== "Current");

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">MOST GOOD · LICENSE & CERTIFICATION CONTROL</span>
        <h1>License vault</h1>
        <p className="fine-print">
          Renewal alerts appear in your dashboard at the 90, 60, or 30-day lead time selected for each record.
        </p>
      </header>

      <section className="report-section license-alerts">
        <h2>{renewalRecords.length} renewal alert{renewalRecords.length === 1 ? "" : "s"} need attention</h2>
        {renewalRecords.map((record) => (
          <div className="license-alert" key={record.licenseNumber}>
            <span className={statusClass(record.status)}>{record.status}</span>
            <div><b>{record.company} — {record.documentName}</b><span>Expires {record.expiresOn} · {record.renewalLeadDays}-day alert rule</span></div>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h2>Company licenses and certifications</h2>
        <table className="report-table">
          <thead><tr><th>Company</th><th>Document</th><th>Jurisdiction</th><th>Reference</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            {licenseRecords.map((record) => (
              <tr key={record.licenseNumber}>
                <td>{record.company}</td>
                <td>{record.documentName}<br /><small>{record.documentType}</small></td>
                <td>{record.jurisdiction}</td>
                <td>{record.licenseNumber}</td>
                <td>{record.expiresOn}</td>
                <td><span className={statusClass(record.status)}>{record.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-section storage-boundary">
        <h2>Document storage setup</h2>
        <p>
          The dashboard currently displays validated sample records and in-app renewal alerts. Before
          uploading company documents or sending email reminders, connect a durable storage provider and
          notification service; Vercel serverless files are not persistent. The storage boundary is
          intentionally documented rather than accepting files that would disappear after deployment.
        </p>
      </section>
    </main>
  );
}
