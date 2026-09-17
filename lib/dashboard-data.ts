import { readFile } from "node:fs/promises";
import path from "node:path";

export type RiskLevel = "High" | "Medium" | "Low";

export type DashboardAction = {
  level: RiskLevel;
  title: string;
  detail: string;
  due: string;
};

export type DashboardMetrics = {
  qualityScore: number;
  qualityScoreChange: string;
  compliantProducts: number;
  compliantProductsChange: string;
  openActions: number;
  actionsDue: number;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  actions: DashboardAction[];
  trend: number[];
};

const dashboardDataPath = path.join(process.cwd(), "data", "dashboard.json");

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<DashboardData>;
  const metrics = data.metrics;

  return Boolean(
    metrics &&
      typeof metrics.qualityScore === "number" &&
      typeof metrics.qualityScoreChange === "string" &&
      typeof metrics.compliantProducts === "number" &&
      typeof metrics.compliantProductsChange === "string" &&
      typeof metrics.openActions === "number" &&
      typeof metrics.actionsDue === "number" &&
      Array.isArray(data.actions) &&
      data.actions.every(
        (action) =>
          action &&
          ["High", "Medium", "Low"].includes(action.level) &&
          typeof action.title === "string" &&
          typeof action.detail === "string" &&
          typeof action.due === "string"
      ) &&
      Array.isArray(data.trend) &&
      data.trend.every((point) => typeof point === "number")
  );
}

/**
 * Server-side repository boundary. Replace the JSON reader with a database
 * query when the hosted QA/regulatory data store is provisioned.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const raw = await readFile(dashboardDataPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isDashboardData(parsed)) {
    throw new Error("Dashboard data failed validation.");
  }

  return parsed;
}
