import { ValidationSuite } from "../../components/validation-suite";

export default function DashboardValidationPage() {
  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Validation control center</h1>
        <p>
          Generate IQ/OQ/PQ protocol steps and log validation execution metrics. Included with
          Foundation and Most Good.
        </p>
      </header>
      <ValidationSuite />
    </main>
  );
}
