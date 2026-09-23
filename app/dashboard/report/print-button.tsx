"use client";

export function PrintButton() {
  return (
    <button className="button button-dark no-print" onClick={() => window.print()}>
      Print / Save as PDF <span>→</span>
    </button>
  );
}
