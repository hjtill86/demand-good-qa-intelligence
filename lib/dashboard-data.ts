import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDataScope, getSupabaseAdmin } from "./supabase-server";

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

export type WeeklyDigest = {
  headline: string;
  summary: string;
  bullets: string[];
};

export type SupplierRisk = {
  name: string;
  category: string;
  score: number;
  trend: "up" | "down" | "flat";
  note: string;
};

export type RegulatoryWatchItem = {
  jurisdiction: string;
  title: string;
  impact: RiskLevel;
  effectiveDate: string;
  summary: string;
};

export type LicenseRecord = {
  company: string;
  documentName: string;
  documentType: "License" | "Certification";
  jurisdiction: string;
  licenseNumber: string;
  expiresOn: string;
  renewalLeadDays: 30 | 60 | 90;
  status: "Current" | "Renewal due" | "Expiring soon";
};

export type DashboardData = {
  metrics: DashboardMetrics;
  actions: DashboardAction[];
  trend: number[];
  weeklyDigest: WeeklyDigest;
  supplierRisk: SupplierRisk[];
  regulatoryWatch: RegulatoryWatchItem[];
  licenseRecords: LicenseRecord[];
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
      data.trend.every((point) => typeof point === "number") &&
      data.weeklyDigest &&
      typeof data.weeklyDigest.headline === "string" &&
      typeof data.weeklyDigest.summary === "string" &&
      Array.isArray(data.weeklyDigest.bullets) &&
      data.weeklyDigest.bullets.every((bullet) => typeof bullet === "string") &&
      Array.isArray(data.supplierRisk) &&
      data.supplierRisk.every(
        (supplier) =>
          supplier &&
          typeof supplier.name === "string" &&
          typeof supplier.category === "string" &&
          typeof supplier.score === "number" &&
          ["up", "down", "flat"].includes(supplier.trend) &&
          typeof supplier.note === "string"
      ) &&
      Array.isArray(data.regulatoryWatch) &&
      data.regulatoryWatch.every(
        (item) =>
          item &&
          typeof item.jurisdiction === "string" &&
          typeof item.title === "string" &&
          ["High", "Medium", "Low"].includes(item.impact) &&
          typeof item.effectiveDate === "string" &&
          typeof item.summary === "string"
      ) &&
      Array.isArray(data.licenseRecords) &&
      data.licenseRecords.every(
        (record) =>
          record &&
          typeof record.company === "string" &&
          typeof record.documentName === "string" &&
          ["License", "Certification"].includes(record.documentType) &&
          typeof record.jurisdiction === "string" &&
          typeof record.licenseNumber === "string" &&
          typeof record.expiresOn === "string" &&
          [30, 60, 90].includes(record.renewalLeadDays) &&
          ["Current", "Renewal due", "Expiring soon"].includes(record.status)
      )
  );
}

/**
 * Server-side repository boundary. Replace the JSON reader with a database
 * query when the hosted QA/regulatory data store is provisioned.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();
  const scope = await getDataScope();
  if (supabase && scope) {
    const { data, error } = await supabase
      .from("dgqi_records")
      .select("record_type,payload")
      .eq("organization_id", scope.organizationId);
    if (error) throw new Error(`Dashboard data query failed: ${error.message}`);
    const rows = data ?? [];
    const first = (type: string) => rows.find((row) => row.record_type === type)?.payload;
    const list = (type: string) => rows.filter((row) => row.record_type === type).map((row) => row.payload);
    const liveData = {
      metrics: first("metric") ?? { qualityScore: 0, qualityScoreChange: "No baseline", compliantProducts: 0, compliantProductsChange: "No baseline", openActions: 0, actionsDue: 0 },
      actions: list("action"),
      trend: [],
      weeklyDigest: first("digest") ?? { headline: "No quality data available yet.", summary: "Add dashboard data to populate this digest.", bullets: [] },
      supplierRisk: list("supplier"),
      regulatoryWatch: list("regulatory"),
      licenseRecords: list("license"),
    };
    if (isDashboardData(liveData)) return liveData;
    throw new Error("Shared dashboard data failed validation.");
  }

  const raw = await readFile(dashboardDataPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isDashboardData(parsed)) {
    throw new Error("Dashboard data failed validation.");
  }

  return parsed;
}
