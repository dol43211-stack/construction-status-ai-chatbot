// 엑셀·한글 내려받기 공통 (PRD M1 "보고서 양식: 한글·엑셀 같은 구성", DESIGN.md 7.2·7.3) — PLAN 24번
// 두 파일이 같은 머리 정보와 같은 표(번호·항목·내용·근거 문서·확인 필요)를 갖도록 여기서 한 번만 정한다.
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.
import type { ReportItem } from "../reports/items.ts";
import { formatPeriod, type PeriodType } from "../reports/period.ts";

/** 내려받기에 필요한 보고서 정보 */
export type ExportableReport = {
  projectName: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  confirmedAt: string | null;
  items: ReportItem[];
};

const kindLabel = (t: PeriodType) => (t === "weekly" ? "주간" : "월간");

/** 제목: "한빛청사 신축공사 월간 진행현황 보고서" */
export const reportTitle = (r: ExportableReport) => `${r.projectName} ${kindLabel(r.periodType)} 진행현황 보고서`;

/** 확정일을 한국 시간 "2026-10-06"으로 */
export function confirmedDate(r: ExportableReport): string {
  if (!r.confirmedAt) return "";
  return new Date(new Date(r.confirmedAt).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 머리 정보 3줄 (공사명 · 보고 기간 · 확정일) */
export function headerRows(r: ExportableReport): [string, string][] {
  return [
    ["공사명", r.projectName],
    ["보고 기간", `${formatPeriod({ start: r.periodStart, end: r.periodEnd })} (${kindLabel(r.periodType)})`],
    ["확정일", confirmedDate(r)],
  ];
}

/** 표의 열 (DESIGN.md 7.3) */
export const TABLE_COLUMNS = ["번호", "항목", "내용", "근거 문서", "확인 필요"] as const;

/** 표의 한 줄: 번호 · 항목 · 내용 · 근거 문서(줄바꿈으로 구분) · 확인 필요 표시 */
export function tableRows(r: ExportableReport): [number, string, string, string, string][] {
  return r.items.map((item, i) => [
    i + 1,
    item.title,
    item.content,
    item.sources.map((s) => s.fileName).join("\n"),
    item.needsCheck ? "확인 필요" : "",
  ]);
}

/**
 * 내려받을 파일 이름: "한빛청사 신축공사_월간보고서_2026-09.xlsx" / 주간은 "…_주간보고서_2026-09-14.xlsx"
 * 윈도우에서 파일 이름에 쓸 수 없는 글자는 빼낸다.
 */
export function exportFileName(r: ExportableReport, ext: "xlsx" | "hwpx"): string {
  const when = r.periodType === "monthly" ? r.periodStart.slice(0, 7) : r.periodStart;
  const safe = r.projectName.replace(/[\\/:*?"<>|]/g, "").trim() || "보고서";
  return `${safe}_${kindLabel(r.periodType)}보고서_${when}.${ext}`;
}

/**
 * 한글 파일 이름이 깨지지 않도록 내려받기 머리말(Content-Disposition)을 만든다.
 * 옛 프로그램용 영문 이름과 표준 방식(UTF-8)의 한글 이름을 함께 넣는다.
 */
export function attachmentHeader(fileName: string): string {
  const ext = fileName.split(".").pop();
  return `attachment; filename="report.${ext}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
