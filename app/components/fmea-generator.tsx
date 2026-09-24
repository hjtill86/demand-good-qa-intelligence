"use client";

import { FormEvent, useState } from "react";

type FmeaRow = {
  id: number;
  mode: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  riskClass: "high" | "med" | "low";
  riskText: string;
};

const severityOptions = [
  { value: 10, label: "10 - Catastrophic" },
  { value: 8, label: "8 - High" },
  { value: 5, label: "5 - Moderate" },
  { value: 2, label: "2 - Low" },
];

const occurrenceOptions = [
  { value: 10, label: "10 - Frequent" },
  { value: 5, label: "5 - Occasional" },
  { value: 2, label: "2 - Rare" },
  { value: 1, label: "1 - Remote" },
];

const detectionOptions = [
  { value: 10, label: "10 - Absolute Uncertainty" },
  { value: 5, label: "5 - Medium Chance" },
  { value: 2, label: "2 - High Chance" },
  { value: 1, label: "1 - Almost Certain" },
];

function riskFromRpn(rpn: number): Pick<FmeaRow, "riskClass" | "riskText"> {
  if (rpn >= 125) return { riskClass: "high", riskText: "High" };
  if (rpn >= 40) return { riskClass: "med", riskText: "Medium" };
  return { riskClass: "low", riskText: "Low" };
}

export function FmeaGenerator() {
  const [mode, setMode] = useState("");
  const [severity, setSeverity] = useState(5);
  const [occurrence, setOccurrence] = useState(5);
  const [detection, setDetection] = useState(5);
  const [rows, setRows] = useState<FmeaRow[]>([]);

  function addRow(event: FormEvent) {
    event.preventDefault();
    const rpn = severity * occurrence * detection;
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        mode: mode.trim() || "Unnamed Failure Mode",
        severity,
        occurrence,
        detection,
        rpn,
        ...riskFromRpn(rpn),
      },
    ]);
    setMode("");
  }

  return (
    <div className="fmea-tool">
      <form className="fmea-form data-form" onSubmit={addRow}>
        <label>
          <span>Potential Failure Mode</span>
          <input
            type="text"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            placeholder="e.g., API Timeout during checkout"
          />
        </label>
        <label>
          <span>Severity (S)</span>
          <select value={severity} onChange={(event) => setSeverity(Number(event.target.value))}>
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Occurrence (O)</span>
          <select value={occurrence} onChange={(event) => setOccurrence(Number(event.target.value))}>
            {occurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Detection (D)</span>
          <select value={detection} onChange={(event) => setDetection(Number(event.target.value))}>
            {detectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-dark" type="submit">
          Add item
        </button>
      </form>

      <table className="report-table fmea-table">
        <thead>
          <tr>
            <th>Failure Mode</th>
            <th>Severity (S)</th>
            <th>Occurrence (O)</th>
            <th>Detection (D)</th>
            <th>RPN</th>
            <th>Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>Add a failure mode to calculate its Risk Priority Number.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.mode}</td>
                <td>{row.severity}</td>
                <td>{row.occurrence}</td>
                <td>{row.detection}</td>
                <td>
                  <strong>{row.rpn}</strong>
                </td>
                <td>
                  <span className={`fmea-badge ${row.riskClass}`}>{row.riskText}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
