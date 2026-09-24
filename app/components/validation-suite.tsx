"use client";

import { FormEvent, useState } from "react";

type Phase = "IQ" | "OQ" | "PQ";

type ProtocolStep = {
  id: string;
  step: string;
  expected: string;
  criteria: string;
};

type KpiRow = {
  id: number;
  timestamp: string;
  protocolId: string;
  result: string;
  integrity: "COMPLIANT" | "DEVIATION";
};

const protocolLibrary: Record<Phase, ProtocolStep[]> = {
  IQ: [
    {
      id: "IQ-01",
      step: "Verify server environment & software dependencies installation version.",
      expected: "All core versions align perfectly with master system design specs.",
      criteria: "Zero critical installation deviations.",
    },
    {
      id: "IQ-02",
      step: "Audit network directory structural access controls and read/write configurations.",
      expected: "Authentication locks isolate restricted folders explicitly.",
      criteria: "Data security configurations pass 100% boundary check.",
    },
  ],
  OQ: [
    {
      id: "OQ-01",
      step: "Trigger boundary functional exceptions & boundary error generation thresholds.",
      expected: "System intercepts exceptions and smoothly outputs secure logs.",
      criteria: "System handles faults without unhandled data dumps.",
    },
    {
      id: "OQ-02",
      step: "Stress execution workflows up to nominal operating tolerance thresholds.",
      expected: "Alert rules trigger warning structures exactly at data caps.",
      criteria: "Data payload thresholds trigger warnings exactly on point.",
    },
  ],
  PQ: [
    {
      id: "PQ-01",
      step: "Execute batch processing workflows across consecutive duty-cycle repetitions.",
      expected: "Consistent operational availability over long periods.",
      criteria: "Zero structural failure modes logged across tests.",
    },
    {
      id: "PQ-02",
      step: "Confirm output integrity against approved process performance ranges.",
      expected: "Results remain inside predefined acceptance windows.",
      criteria: "No out-of-specification results across consecutive runs.",
    },
  ],
};

const seedKpis: KpiRow[] = [
  {
    id: 1,
    timestamp: "2026-09-24",
    protocolId: "PROT-LIMS-IQ-09",
    result: "Successful Build Integrity",
    integrity: "COMPLIANT",
  },
];

export function ValidationSuite() {
  const [tab, setTab] = useState<"protocol" | "kpis">("protocol");
  const [sysName, setSysName] = useState("");
  const [phase, setPhase] = useState<Phase>("IQ");
  const [objective, setObjective] = useState("");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<ProtocolStep[]>([]);
  const [kpiRef, setKpiRef] = useState("");
  const [kpiStatus, setKpiStatus] = useState<"Pass" | "Fail">("Pass");
  const [kpiRows, setKpiRows] = useState<KpiRow[]>(seedKpis);

  function generateProtocol(event: FormEvent) {
    event.preventDefault();
    const name = sysName.trim() || "Core Platform Component";
    const objectiveText = objective.trim() || "Verify architectural configuration constraints.";
    setSummary(
      `Executive Summary for ${name} (${phase}): This suite formally establishes documented evidence that the system parameters adhere to predefined performance characteristics. Testing verifies operational bounds targeting constraints described as: "${objectiveText}" under strict GxP quality guidelines.`
    );
    setSteps(protocolLibrary[phase]);
  }

  function addKpiRow(event: FormEvent) {
    event.preventDefault();
    const protocolId = kpiRef.trim() || "VAL-UNNAMED";
    const passed = kpiStatus === "Pass";
    setKpiRows((current) => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString().slice(0, 10),
        protocolId,
        result: passed ? "Successful execution logged" : "Deviation logged",
        integrity: passed ? "COMPLIANT" : "DEVIATION",
      },
      ...current,
    ]);
    setKpiRef("");
    setKpiStatus("Pass");
  }

  return (
    <div className="validation-suite">
      <div className="validation-tabs" role="tablist">
        <button
          type="button"
          className={tab === "protocol" ? "validation-tab active" : "validation-tab"}
          onClick={() => setTab("protocol")}
        >
          IQ/OQ/PQ generator
        </button>
        <button
          type="button"
          className={tab === "kpis" ? "validation-tab active" : "validation-tab"}
          onClick={() => setTab("kpis")}
        >
          Validation KPI tracker
        </button>
      </div>

      {tab === "protocol" ? (
        <div className="validation-grid">
          <form className="data-form" onSubmit={generateProtocol}>
            <h2>System validation protocol generator</h2>
            <label>
              <span>System / asset name</span>
              <input
                value={sysName}
                onChange={(event) => setSysName(event.target.value)}
                placeholder="e.g., Enterprise LIMS Software"
              />
            </label>
            <label>
              <span>Validation phase</span>
              <select value={phase} onChange={(event) => setPhase(event.target.value as Phase)}>
                <option value="IQ">Installation Qualification (IQ) — Environment & specs</option>
                <option value="OQ">Operational Qualification (OQ) — Boundaries & alarms</option>
                <option value="PQ">Performance Qualification (PQ) — Real-world stability</option>
              </select>
            </label>
            <label>
              <span>Test objective & boundary parameters</span>
              <textarea
                rows={4}
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Describe what functionalities or limits are being stressed..."
              />
            </label>
            <button className="button button-dark" type="submit">
              Compile protocol & run specs
            </button>
          </form>

          {steps.length > 0 ? (
            <div>
              <div className="validation-summary">
                <h3>Executive summary blueprint</h3>
                <p>{summary}</p>
              </div>
              <h3>Generated testing protocols</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Test ID</th>
                    <th>Verification step</th>
                    <th>Expected result</th>
                    <th>Regulatory acceptance criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.id}>
                      <td>{step.id}</td>
                      <td>{step.step}</td>
                      <td>{step.expected}</td>
                      <td>{step.criteria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <h2>Live validation quality metrics</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span>FIRST-PASS YIELD (FPY)</span>
              <strong>94.2<small>%</small></strong>
            </div>
            <div className="metric-card">
              <span>OPEN VALIDATION DEVIATIONS</span>
              <strong>3</strong>
              <b className="neutral">Active</b>
            </div>
            <div className="metric-card">
              <span>AVERAGE CYCLE TIME TO CLOSE</span>
              <strong>4.5<small> days</small></strong>
            </div>
          </div>

          <form className="data-form validation-kpi-form" onSubmit={addKpiRow}>
            <h2>Log new validation execution metric</h2>
            <label>
              <span>Protocol reference</span>
              <input
                value={kpiRef}
                onChange={(event) => setKpiRef(event.target.value)}
                placeholder="VAL-2026-OQ-01"
              />
            </label>
            <label>
              <span>Execution status</span>
              <select
                value={kpiStatus}
                onChange={(event) => setKpiStatus(event.target.value as "Pass" | "Fail")}
              >
                <option value="Pass">Pass (Zero Deviations)</option>
                <option value="Fail">Fail (Deviation Logged)</option>
              </select>
            </label>
            <button className="button button-dark" type="submit">
              Log metric
            </button>
          </form>

          <table className="report-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Protocol ID</th>
                <th>Result tracking</th>
                <th>Quality integrity status</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.timestamp}</td>
                  <td>{row.protocolId}</td>
                  <td>{row.result}</td>
                  <td>
                    <span className={row.integrity === "COMPLIANT" ? "status-pass" : "status-fail"}>
                      {row.integrity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
