// GET /api/reports/[id]/xlsx — 확정 보고서 엑셀 내려받기 (DESIGN.md 6.1) — PLAN 24번
// 확정된 보고서만 내려받을 수 있다. (설계 검토 m-9: 초안이 밖으로 나가지 않게)
// 파일은 보관하지 않고 누를 때마다 장부의 보고서 내용으로 새로 만든다.
import { getReport } from "@/lib/data/reports";
import { attachmentHeader, exportFileName } from "@/lib/export/common";
import { buildReportXlsx } from "@/lib/export/xlsx";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/xlsx">) {
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

  const bytes = await buildReportXlsx(report);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": attachmentHeader(exportFileName(report, "xlsx")),
      "Cache-Control": "no-store",
    },
  });
}
