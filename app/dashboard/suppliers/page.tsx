import { listSupplierFiles } from "../../../lib/supplier-files";
import { SupplierRegister } from "./supplier-register";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const result = await listSupplierFiles();
  const records = result.ok ? result.records : [];
  const storageError = result.ok ? undefined : result.error;

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Approved suppliers</h1>
        <p className="fine-print">
          Keep the approval and the certificate for each supplier. A certificate shows as expiring inside
          the 30, 60, or 90 day window you choose, and as expired after that date.
          The file stays until you replace or delete it.
          <a href="/dashboard"> ← Workspace</a>
        </p>
      </header>
      <SupplierRegister initialRecords={records} storageError={storageError} />
    </main>
  );
}
