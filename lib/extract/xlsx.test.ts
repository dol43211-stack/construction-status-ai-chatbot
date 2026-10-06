// 엑셀 글자 꺼내기 시험 (실행: npm test)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { maskPersonalInfo } from "../masking.ts";
import { extractXlsxText } from "./xlsx.ts";

const sample = (name: string) => new Uint8Array(readFileSync(`samples/files/${name}`));

/** 시험용 엑셀 파일을 메모리에서 만든다 */
async function makeWorkbook(build: (wb: ExcelJS.Workbook) => void): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

describe("샘플 업체 보고서", () => {
  it("월간보고서: 머리 정보와 9개 항목을 '구분 | 내용' 줄로 꺼낸다", async () => {
    const text = await extractXlsxText(sample("한빛청사_업체월간보고서_2026-09.xlsx"));
    assert.match(text, /^공사 월간 진행보고서 \(2026년 9월\)$/m);
    assert.match(text, /^공사명 \| 한빛청사 신축공사$/m);
    assert.match(text, /^작성일 \| 2026-10-02$/m);
    assert.match(text, /^공정률 \| 계획 42\.0% \/ 실적 43\.1%/m);
    assert.match(text, /^건설사고 현황 \| 9월 17일 3층 거푸집/m);
  });

  it("병합된 제목 칸은 한 번만 나온다", async () => {
    const text = await extractXlsxText(sample("한빛청사_업체월간보고서_2026-09.xlsx"));
    assert.equal(text.split("공사 월간 진행보고서").length - 1, 1);
  });

  it("함정 문서의 개인정보는 꺼낸 뒤 가림 처리하면 가려진다", async () => {
    const text = maskPersonalInfo(await extractXlsxText(sample("한빛청사_업체월간보고서_2026-09.xlsx")));
    assert.match(text, /900101-1\*{6}/);
    assert.match(text, /010-\*{4}-5678/);
    assert.match(text, /110-\*{3}-\*{6}/);
    assert.match(text, /333\*{10}/);
    assert.ok(!text.includes("1234567"), "주민번호 뒷자리가 남으면 안 된다");
    assert.match(text, /123-45-67890/, "사업자등록번호는 그대로");
  });

  it("주간보고서: 줄인 공사명과 기간을 그대로 꺼낸다 (샘플 함정)", async () => {
    const text = await extractXlsxText(sample("하늘마루_업체주간보고서_2026-08-24_30.xlsx"));
    assert.match(text, /^공사명 \| 하늘마루 복합문화센터$/m);
    assert.match(text, /^보고기간 \| 2026-08-24\(월\) ~ 2026-08-30\(일\)$/m);
    assert.match(text, /굴착기 후진 중 자재 적치대 접촉/);
  });

  it("샘플 엑셀 18개가 모두 읽힌다", async () => {
    const files = ["한빛청사", "누리초", "하늘마루"].flatMap((p) => [
      `${p}_업체월간보고서_2026-08.xlsx`,
      `${p}_업체월간보고서_2026-09.xlsx`,
      ...["2026-08-10_16", "2026-08-24_30", "2026-09-07_13", "2026-09-21_27"].map((w) => `${p}_업체주간보고서_${w}.xlsx`),
    ]);
    for (const f of files) {
      const text = await extractXlsxText(sample(f));
      assert.ok(text.length > 100, `${f}: ${text.length}자`);
    }
  });
});

describe("엑셀 특수 칸 처리", () => {
  it("날짜·백분율·큰 정수·수식·병합 칸", async () => {
    const bytes = await makeWorkbook((wb) => {
      const ws = wb.addWorksheet("현황");
      ws.mergeCells("A1:C1");
      ws.getCell("A1").value = "주간 현황";
      ws.getRow(2).values = ["작성일", new Date(Date.UTC(2026, 9, 3))];
      ws.getRow(3).values = ["공정률", 0.425];
      ws.getCell("B3").numFmt = "0.0%";
      ws.getRow(4).values = ["기성금액", 1380000000];
      ws.getRow(5).values = ["연도", 2026];
      ws.getRow(6).values = ["합계", { formula: "1+2", result: 3 }];
    });
    const text = await extractXlsxText(bytes);
    assert.equal(
      text,
      ["주간 현황", "작성일 | 2026-10-03", "공정률 | 42.5%", "기성금액 | 1,380,000,000", "연도 | 2026", "합계 | 3"].join("\n"),
    );
    // 쉼표 덕분에 10자리 금액이 계좌번호로 오인되어 가려지지 않는다
    assert.equal(maskPersonalInfo(text), text);
  });

  it("시트가 여러 개면 시트 이름을 붙이고, 빈 시트는 건너뛴다", async () => {
    const bytes = await makeWorkbook((wb) => {
      wb.addWorksheet("1주차").getRow(1).values = ["공정률", "40%"];
      wb.addWorksheet("빈 시트");
      wb.addWorksheet("2주차").getRow(1).values = ["공정률", "42%"];
    });
    assert.equal(await extractXlsxText(bytes), "[1주차]\n공정률 | 40%\n\n[2주차]\n공정률 | 42%");
  });

  it("엑셀이 아닌 압축 파일은 오류를 낸다 (올리기 단계에서 걸러짐)", async () => {
    await assert.rejects(extractXlsxText(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0])));
  });
});
