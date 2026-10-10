import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

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
  if (!fileName) {
    return new NextResponse("Not found", { status: 404 });
  }

  const html = await readFile(path.join(process.cwd(), "content", "qms-tools", fileName), "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
