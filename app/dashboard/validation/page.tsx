import { ValidationSuite } from "../../components/validation-suite";

export default function DashboardValidationPage() {
  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">FOUNDATION + MOST GOOD</span>
        <h1>Validation control center</h1>
        <p>
          Draft IQ/OQ/PQ steps for a system you name. Print the page to keep the draft. Most Good stores
          the Part 11 tests you run and sign on Part 11 validation.
        </p>
      </header>
      <ValidationSuite />
    </main>
  );
}
