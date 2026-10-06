// 보고서 9개 항목 (PRD 1장·5장 M1 규칙 1) — 이름과 순서는 이곳에서만 정의한다. (DESIGN.md 10장 report-items)
// 보고서 초안, 검토 화면, 엑셀·한글 내려받기가 모두 이 목록을 쓴다.
// 비밀 값을 다루지 않으므로 서버·화면·시험 어디서든 불러올 수 있다.

export const REPORT_ITEMS = [
  { key: "progress", title: "공정률" },
  { key: "payment", title: "기성 실적" },
  { key: "contractChange", title: "계약변경 현황" },
  { key: "subcontract", title: "하도급 현황" },
  { key: "materials", title: "관급자재 수급현황" },
  { key: "wages", title: "하도급 및 근로자 노임지급 현황" },
  { key: "defects", title: "시공실패 및 하자 현황" },
  { key: "accident", title: "건설사고 현황" },
  { key: "issues", title: "주요 이슈" },
] as const;

export type ReportItemKey = (typeof REPORT_ITEMS)[number]["key"];
export const REPORT_ITEM_KEYS = REPORT_ITEMS.map((i) => i.key) as [ReportItemKey, ...ReportItemKey[]];

/** 문서에 내용이 없는 항목에 쓰는 문구 (M1 규칙 2) */
export const NO_DATA = "해당 기간 자료 없음";

/** 보고서 항목의 근거 문서 */
export type ItemSource = { documentId: string; fileName: string; writtenDate: string | null };

/** 보고서에 저장되는 항목 하나 (reports.items 칸) */
export type ReportItem = {
  key: ReportItemKey;
  title: string;
  content: string;
  sources: ItemSource[];
  /** 문서끼리 값이 다르거나 근거 표시가 빠져서 직원이 꼭 봐야 하는 항목 */
  needsCheck: boolean;
};
