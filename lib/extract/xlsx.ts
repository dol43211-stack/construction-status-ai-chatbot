// 엑셀(.xlsx)에서 글자 꺼내기 (DESIGN.md 4.2 흐름 ① 3단계) — PLAN 14번
// 시트마다 한 줄에 한 행씩, 칸 사이는 " | "로 이어 붙인다. 예) "공정률 | 계획 42.0% / 실적 43.1%"
// 엑셀 특유의 문제를 이렇게 처리한다.
// - 병합된 칸: 합쳐진 칸들이 같은 글자를 반복해서 돌려주므로 맨 앞 칸 하나만 쓴다.
// - 날짜 칸: "2026-10-02"처럼 날짜만 쓴다.
// - 백분율 칸: 엑셀은 42.5%를 0.425로 저장하므로 다시 "42.5%"로 바꾼다.
// - 큰 정수 칸(5자리 이상): "1,380,000,000"처럼 쉼표를 넣는다.
//   쉼표가 없으면 10자리 이상 금액이 계좌번호로 오인되어 가려질 수 있다. (계좌번호는 보통 글자 칸에 적힌다)
import ExcelJS from "exceljs";
import { tidyText } from "./tidy.ts";

/** 엑셀 파일 내용에서 모든 시트의 글자를 꺼낸다 */
export async function extractXlsxText(bytes: Uint8Array): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  // exceljs가 받는 형식(Node Buffer)으로 바꿔서 넘긴다.
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);

  const showSheetNames = workbook.worksheets.length > 1;
  const parts: string[] = [];
  for (const sheet of workbook.worksheets) {
    const lines: string[] = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.isMerged && cell.master !== cell) return; // 병합된 칸의 복사본은 건너뛴다
        const text = cellText(cell).trim();
        if (text) cells.push(text);
      });
      if (cells.length) lines.push(cells.join(" | "));
    });
    if (!lines.length) continue;
    parts.push(showSheetNames ? `[${sheet.name}]\n${lines.join("\n")}` : lines.join("\n"));
  }
  return tidyText(parts.join("\n\n"));
}

/** 칸 하나의 값을 사람이 읽는 글자로 바꾼다 */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.type === ExcelJS.ValueType.Formula ? cell.result : cell.value;

  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    if (cell.numFmt?.includes("%")) return `${round(value * 100)}%`;
    if (Number.isInteger(value) && Math.abs(value) >= 10_000) return value.toLocaleString("ko-KR");
    return String(round(value));
  }
  return cell.text ?? "";
}

/** 엑셀 계산 때문에 생기는 0.1+0.2=0.30000000000000004 같은 꼬리를 정리한다 */
const round = (n: number) => Math.round(n * 1e6) / 1e6;
