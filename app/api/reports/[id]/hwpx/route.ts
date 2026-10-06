// GET /api/reports/[id]/hwpx — 확정 보고서 한글 내려받기 (DESIGN.md 6.1) — PLAN 25번
// 확정된 보고서만 내려받을 수 있다. 파일은 보관하지 않고 누를 때마다 새로 만든다.
import { getReport } from "@/lib/data/reports";
import { attachmentHeader, exportFileName } from "@/lib/export/common";
import { buildReportHwpx } from "@/lib/export/hwpx";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/hwpx">) {
  const { id } = await ctx.params;

  let report;
  try {
    report = await getReport(id);
  } catch {
    return Response.json({ error: "보고서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  if (!report) return Response.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  if (report.status !== "confirmed") {
    return Response.json({ error: "확정된 보고서만 내려받을 수 있습니다." }, { status: 403 });
  }

  const bytes = await buildReportHwpx(report);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/hwp+zip",
      "Content-Disposition": attachmentHeader(exportFileName(report, "hwpx")),
      "Cache-Control": "no-store",
    },
  });
}
