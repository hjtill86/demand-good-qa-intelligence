import { FmeaGenerator } from "../../components/fmea-generator";

export default function DashboardFmeaPage() {
  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>FMEA risk prioritization generator</h1>
        <p>
          Score potential failure modes by severity, occurrence, and detection. The Risk Priority
          Number (RPN) is S × O × D.
        </p>
      </header>
      <FmeaGenerator />
    </main>
  );
}
