// PDF 글자 꺼내기 시험 (실행: npm test) — 샘플 문서(samples/files)를 그대로 쓴다
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractPdfText } from "./pdf.ts";
import { tidyText } from "./tidy.ts";

const sample = (name: string) => new Uint8Array(readFileSync(`samples/files/${name}`));

describe("PDF 글자 꺼내기", () => {
  it("감리 월간보고서의 공사 정보와 숫자를 그대로 꺼낸다", async () => {
    const text = await extractPdfText(sample("한빛청사_감리월간보고서_2026-09.pdf"));
    assert.match(text, /공사명 한빛청사 신축공사/);
    assert.match(text, /보고기간 2026-09-01 ~ 2026-09-30/);
    assert.match(text, /실적 42\.5%/);
    assert.match(text, /거푸집 해체 작업 중 근로자 1명/);
  });

  it("9개 항목 제목이 모두 순서대로 나온다", async () => {
    const text = await extractPdfText(sample("하늘마루_감리월간보고서_2026-08.pdf"));
    const titles = ["1. 공정률", "2. 기성 실적", "3. 계약변경 현황", "4. 하도급 현황", "5. 관급자재 수급현황",
      "6. 하도급 및 근로자 노임지급 현황", "7. 시공실패 및 하자 현황", "8. 건설사고 현황", "9. 주요 이슈"];
    const positions = titles.map((t) => text.indexOf(t));
    assert.ok(positions.every((p) => p >= 0), "모든 항목 제목이 있어야 한다");
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, "순서가 맞아야 한다");
  });

  it("건설사고 언급이 없는 문서에는 8번 항목이 없다 (샘플 함정)", async () => {
    const text = await extractPdfText(sample("누리초_감리월간보고서_2026-08.pdf"));
    assert.ok(!text.includes("건설사고"));
  });

  it("스캔본(그림뿐인 PDF)은 글자가 거의 없다", async () => {
    const text = await extractPdfText(sample("스캔본_누리초_감리월간보고서_2026-08.pdf"));
    assert.ok(text.replace(/\s/g, "").length < 10, `꺼낸 글자 수: ${text.length}`);
  });

  it("같은 데이터로 두 번 꺼내도 원본이 망가지지 않는다", async () => {
    const bytes = sample("누리초_감리월간보고서_2026-09.pdf");
    const first = await extractPdfText(bytes);
    const second = await extractPdfText(bytes);
    assert.equal(first, second);
  });
});

describe("글자 다듬기", () => {
  it("줄 끝 공백과 연속 빈 줄을 정리한다", () => {
    assert.equal(tidyText("  가  나 \r\n\r\n\r\n\r\n다\t\t라  "), "가 나\n\n다 라");
  });
});
