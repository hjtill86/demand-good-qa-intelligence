import { PrintButton } from "../report/print-button";
import { DataManager } from "./data-manager";

export default function DataPage() {
  return (
    <main className="report-page">
      <PrintButton />
      <header className="report-header">
        <span className="eyebrow">DGQI DATA WORKSPACE</span>
        <h1>Manage your organization&apos;s data</h1>
        <p>Add and remove the records used by the dashboard. Data is shared with members of the active Clerk organization.</p>
      </header>
      <DataManager />
    </main>
  );
}
