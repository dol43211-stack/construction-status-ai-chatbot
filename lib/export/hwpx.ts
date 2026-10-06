// 확정 보고서 → 한글(.hwpx) 파일 만들기 (DESIGN.md 7.2) — PLAN 25번
// 엑셀(7.3)과 같은 구성: 제목 → 머리 정보(공사명·보고 기간·확정일) → 표(번호·항목·내용·근거 문서·확인 필요)
// 파일은 보관하지 않고, 내려받기를 누를 때마다 새로 만든다.
import { buildHwpx, TEXT_WIDTH, type HwpxCell } from "../hwpx/write.ts";
import { headerRows, reportTitle, TABLE_COLUMNS, tableRows, type ExportableReport } from "./common.ts";

/** 표 칸 너비 (합계 = 본문 너비 42520) */
const WIDTHS = [2800, 7000, 18720, 9000, 5000];

export async function buildReportHwpx(report: ExportableReport): Promise<Uint8Array> {
  if (WIDTHS.reduce((a, b) => a + b, 0) !== TEXT_WIDTH) throw new Error("표 너비가 본문 너비와 다릅니다.");

  const rows: HwpxCell[][] = tableRows(report).map(([no, title, content, sources, check]) => [
    { text: String(no), align: "center" },
    { text: title },
    { text: content },
    { text: sources },
    { text: check, style: check ? "alert" : "normal", align: "center" },
  ]);

  const title = reportTitle(report);
  return buildHwpx(title, [
    { type: "paragraph", text: title, style: "title", align: "center" },
    { type: "paragraph", text: "" },
    { type: "fields", rows: headerRows(report) },
    { type: "paragraph", text: "" },
    { type: "table", columns: TABLE_COLUMNS.map((t, i) => ({ title: t, width: WIDTHS[i] })), rows },
  ]);
}
