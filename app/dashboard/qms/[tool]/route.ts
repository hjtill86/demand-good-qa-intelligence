import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isQmsTool, qmsPersistenceMarkup, readQmsState } from "../../../../lib/qms-state";

export const dynamic = "force-dynamic";

const tools: Record<string, string> = {
  "management-review": "Management_Review_Dashboard.html",
  capa: "CAPA_RCA_Toolkit.html",
  "audit-readiness": "Audit_Readiness_Pack.html",
  "spc-msa": "SPC_MSA_Tools_Pack.html",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ tool: string }> },
) {
  const { tool } = await context.params;
  const fileName = tools[tool];
  if (!fileName || !isQmsTool(tool)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readFile(path.join(process.cwd(), "content", "qms-tools", fileName), "utf8");
  const state = await readQmsState(tool);
  const html = file.replace("<script>", `${qmsPersistenceMarkup(tool, state)}<script>`);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
