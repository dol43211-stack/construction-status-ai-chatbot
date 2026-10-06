// 확정 보고서 → 엑셀(.xlsx) 파일 만들기 (DESIGN.md 7.3) — PLAN 24번
// 시트 1개 "보고서": 1행 제목, 2~4행 공사명·보고 기간·확정일, 6행부터 표 (번호 · 항목 · 내용 · 근거 문서 · 확인 필요)
// 파일은 보관하지 않고, 내려받기를 누를 때마다 새로 만든다. (DESIGN.md 4.3 7단계)
import ExcelJS from "exceljs";
import { headerRows, reportTitle, TABLE_COLUMNS, tableRows, type ExportableReport } from "./common.ts";

const THIN = { style: "thin" as const, color: { argb: "FF94A3B8" } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const TABLE_START = 6;

export async function buildReportXlsx(report: ExportableReport): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "공사관리 현황 AI챗봇";
  const ws = wb.addWorksheet("보고서", {
    // 인쇄: A4 가로, 너비를 한 쪽에 맞춤
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 6 }, { width: 22 }, { width: 70 }, { width: 34 }, { width: 11 }];

  // 1행: 제목
  ws.mergeCells(1, 1, 1, TABLE_COLUMNS.length);
  const title = ws.getCell(1, 1);
  title.value = reportTitle(report);
  title.font = { size: 16, bold: true };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // 2~4행: 머리 정보
  headerRows(report).forEach(([label, value], i) => {
    const row = ws.getRow(2 + i);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    ws.mergeCells(2 + i, 1, 2 + i, 2);
    row.getCell(3).value = value;
  });

  // 6행: 표 머리
  const head = ws.getRow(TABLE_START);
  TABLE_COLUMNS.forEach((name, i) => {
    const cell = head.getCell(i + 1);
    cell.value = name;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDER;
  });

  // 7행부터: 9개 항목
  tableRows(report).forEach((values, i) => {
    const row = ws.getRow(TABLE_START + 1 + i);
    values.forEach((v, c) => {
      const cell = row.getCell(c + 1);
      cell.value = v === "" ? null : v; // 빈 글자 대신 진짜 빈 칸
      cell.border = BORDER;
      cell.alignment = { vertical: "top", wrapText: true, horizontal: c === 0 || c === 4 ? "center" : "left" };
    });
    if (values[4]) row.getCell(5).font = { bold: true, color: { argb: "FFC2410C" } }; // 확인 필요는 주황 굵게
  });

  // 인쇄할 때 표 머리를 쪽마다 반복
  ws.pageSetup.printTitlesRow = `${TABLE_START}:${TABLE_START}`;

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
