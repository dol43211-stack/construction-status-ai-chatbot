// 엑셀 내려받기 파일 시험 (실행: npm test) — PLAN 24번
// 만든 파일을 다시 열어서, 들어가야 할 내용이 제자리에 있는지 확인한다.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { NO_DATA, REPORT_ITEMS } from "../reports/items.ts";
import { attachmentHeader, exportFileName, type ExportableReport } from "./common.ts";
import { buildReportXlsx } from "./xlsx.ts";

const REPORT: ExportableReport = {
  projectName: "한빛청사 신축공사",
  periodType: "monthly",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  confirmedAt: "2026-10-06T10:30:00Z", // 한국 시간 10월 6일 19:30
  items: REPORT_ITEMS.map(({ key, title }, i) => ({
    key,
    title,
    content: i === 0 ? "실적 42.5%임 (감리보고서 10.5.).\n둘째 줄" : NO_DATA,
    sources: i === 0 ? [
      { documentId: "d1", fileName: "한빛청사_감리월간보고서_2026-09.pdf", writtenDate: "2026-10-05" },
      { documentId: "d2", fileName: "한빛청사_업체월간보고서_2026-09.xlsx", writtenDate: "2026-10-02" },
    ] : [],
    needsCheck: i === 0,
  })),
};

async function open(bytes: Uint8Array) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  return wb.getWorksheet("보고서")!;
}

describe("엑셀 보고서 파일", () => {
  it("제목·머리 정보가 제자리에 있다", async () => {
    const ws = await open(await buildReportXlsx(REPORT));
    assert.equal(ws.getCell("A1").value, "한빛청사 신축공사 월간 진행현황 보고서");
    assert.deepEqual([ws.getCell("A2").value, ws.getCell("C2").value], ["공사명", "한빛청사 신축공사"]);
    assert.equal(ws.getCell("C3").value, "2026-09-01 ~ 2026-09-30 (월간)");
    assert.equal(ws.getCell("C4").value, "2026-10-06");
  });

  it("표는 5칸 머리 + 9개 항목, 정해진 순서", async () => {
    const ws = await open(await buildReportXlsx(REPORT));
    assert.deepEqual((ws.getRow(6).values as ExcelJS.CellValue[]).slice(1), ["번호", "항목", "내용", "근거 문서", "확인 필요"]);
    for (let i = 0; i < 9; i++) {
      assert.equal(ws.getCell(7 + i, 1).value, i + 1);
      assert.equal(ws.getCell(7 + i, 2).value, REPORT_ITEMS[i].title);
    }
    assert.equal(ws.getCell(16, 1).value, null); // 9개 다음 줄은 비어 있음
  });

  it("내용 줄바꿈, 근거 문서 여러 개, 확인 필요 표시", async () => {
    const ws = await open(await buildReportXlsx(REPORT));
    assert.equal(ws.getCell("C7").value, "실적 42.5%임 (감리보고서 10.5.).\n둘째 줄");
    assert.equal(ws.getCell("D7").value, "한빛청사_감리월간보고서_2026-09.pdf\n한빛청사_업체월간보고서_2026-09.xlsx");
    assert.equal(ws.getCell("E7").value, "확인 필요");
    assert.equal(ws.getCell("C8").value, NO_DATA);
    assert.equal(ws.getCell("E8").value, null); // 빈 칸은 비워 둠
  });
});

describe("파일 이름", () => {
  it("월간은 연-월, 주간은 시작일", () => {
    assert.equal(exportFileName(REPORT, "xlsx"), "한빛청사 신축공사_월간보고서_2026-09.xlsx");
    assert.equal(
      exportFileName({ ...REPORT, periodType: "weekly", periodStart: "2026-09-14" }, "hwpx"),
      "한빛청사 신축공사_주간보고서_2026-09-14.hwpx",
    );
  });
  it("파일 이름에 쓸 수 없는 글자는 뺀다", () => {
    assert.equal(exportFileName({ ...REPORT, projectName: 'A/B:C*"D"' }, "xlsx"), "ABCD_월간보고서_2026-09.xlsx");
  });
  it("한글 이름이 깨지지 않게 표준 방식으로 담는다", () => {
    assert.equal(
      attachmentHeader("한빛_월간보고서_2026-09.xlsx"),
      `attachment; filename="report.xlsx"; filename*=UTF-8''%ED%95%9C%EB%B9%9B_%EC%9B%94%EA%B0%84%EB%B3%B4%EA%B3%A0%EC%84%9C_2026-09.xlsx`,
    );
  });
});
