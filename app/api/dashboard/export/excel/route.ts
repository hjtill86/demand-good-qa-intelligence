import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import ExcelJS from "exceljs";
import { getDashboardData } from "../../../../../lib/dashboard-data";
import { getThinkificAccess } from "../../../../../lib/thinkific-entitlements";
import { getRegulatoryWatchFeed } from "../../../../../lib/regulatory-feed";

export async function GET() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const access = email ? await getThinkificAccess(email) : { status: "error" as const, email: "" };

  if (access.status !== "active") {
    return NextResponse.json({ error: "An active membership is required to export the dashboard." }, { status: 403 });
  }

  const hasMostGood = access.plan === "most-good";
  const { metrics, actions, weeklyDigest, supplierRisk, regulatoryWatch: mockRegulatoryWatch } = await getDashboardData();
  const liveRegulatoryWatch = hasMostGood ? await getRegulatoryWatchFeed() : [];
  const regulatoryRows = liveRegulatoryWatch.length > 0 ? liveRegulatoryWatch : mockRegulatoryWatch;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Demand Good QA Intelligence";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Overview");
  overview.columns = [
    { header: "Metric", key: "metric", width: 32 },
    { header: "Value", key: "value", width: 20 },
    { header: "Change vs last period", key: "change", width: 24 },
  ];
  overview.addRows([
    { metric: "Overall quality score", value: `${metrics.qualityScore}/100`, change: metrics.qualityScoreChange },
    { metric: "Compliant products", value: `${metrics.compliantProducts}%`, change: metrics.compliantProductsChange },
    { metric: "Open actions", value: metrics.openActions, change: `${metrics.actionsDue} due this week` },
  ]);
  overview.addRow({});
  overview.addRow({ metric: "Weekly digest", value: weeklyDigest.headline });
  overview.addRow({ metric: "", value: weeklyDigest.summary });
  weeklyDigest.bullets.forEach((bullet) => overview.addRow({ metric: "", value: `• ${bullet}` }));
  overview.getRow(1).font = { bold: true };

  const actionsSheet = workbook.addWorksheet("Open Actions");
  actionsSheet.columns = [
    { header: "Risk level", key: "level", width: 14 },
    { header: "Title", key: "title", width: 36 },
    { header: "Detail", key: "detail", width: 36 },
    { header: "Due", key: "due", width: 16 },
  ];
  actionsSheet.addRows(actions);
  actionsSheet.getRow(1).font = { bold: true };

  if (hasMostGood) {
    const supplierSheet = workbook.addWorksheet("Supplier Risk");
    supplierSheet.columns = [
      { header: "Supplier", key: "name", width: 28 },
      { header: "Category", key: "category", width: 22 },
      { header: "Risk score", key: "score", width: 14 },
      { header: "Trend", key: "trend", width: 10 },
      { header: "Note", key: "note", width: 44 },
    ];
    supplierSheet.addRows(supplierRisk);
    supplierSheet.getRow(1).font = { bold: true };

    const regulatorySheet = workbook.addWorksheet("Regulatory Watch");
    regulatorySheet.columns = [
      { header: "Agency/Jurisdiction", key: "jurisdiction", width: 26 },
      { header: "Title", key: "title", width: 44 },
      { header: "Impact", key: "impact", width: 12 },
      { header: "Date", key: "date", width: 16 },
      { header: "Summary", key: "summary", width: 60 },
      { header: "Link", key: "link", width: 40 },
    ];
    regulatoryRows.forEach((item) => {
      regulatorySheet.addRow({
        jurisdiction: item.jurisdiction,
        title: item.title,
        impact: item.impact,
        date: "publishedAt" in item ? new Date(item.publishedAt).toLocaleDateString() : item.effectiveDate,
        summary: item.summary,
        link: "link" in item ? item.link : "",
      });
    });
    regulatorySheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `demand-good-qa-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
