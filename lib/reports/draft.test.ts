// 보고서 초안 검사·보정 시험 (실행: npm test) — PLAN 20번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasUncitedNumbers, labelOf, normalizeDraft, type AiDraft, type DraftDocument } from "./draft.ts";
import { NO_DATA, REPORT_ITEMS } from "./items.ts";

const DOCS: DraftDocument[] = [
  { documentId: "d1", fileName: "한빛청사_감리월간보고서_2026-09.pdf", writtenDate: "2026-10-05" },
  { documentId: "d2", fileName: "한빛청사_업체월간보고서_2026-09.xlsx", writtenDate: "2026-10-02" },
];
const item = (key: AiDraft["items"][number]["key"], content: string, needs_check = false) => ({ key, content, needs_check });

describe("9개 항목 순서와 빠진 항목", () => {
  it("AI가 순서를 섞고 일부를 빠뜨려도 9개를 정해진 순서로 채운다", () => {
    const items = normalizeDraft(
      { items: [item("issues", "추석 연휴 작업 중지 [1]"), item("progress", "실적 42.5% [1]")] },
      DOCS,
    );
    assert.deepEqual(
      items.map((i) => i.title),
      REPORT_ITEMS.map((i) => i.title),
    );
    assert.equal(items[0].content, "실적 42.5% (한빛청사_감리월간보고서_2026-09)");
    assert.equal(items[1].content, NO_DATA); // 빠진 기성 실적
    assert.equal(items[8].content, "추석 연휴 작업 중지 (한빛청사_감리월간보고서_2026-09)");
  });

  it("빈 내용이나 '해당 기간 자료 없음.'은 정해진 문구로 통일하고 근거·확인 표시를 지운다", () => {
    const items = normalizeDraft({ items: [item("accident", "  "), item("defects", "해당 기간 자료 없음.", true)] }, DOCS);
    for (const i of items.filter((x) => x.key === "accident" || x.key === "defects")) {
      assert.deepEqual([i.content, i.sources, i.needsCheck], [NO_DATA, [], false]);
    }
  });
});

describe("근거 문서 표시", () => {
  it("[번호]를 문서 이름으로 바꾸고, 여러 개면 한 괄호에 모은다", () => {
    const [progress] = normalizeDraft(
      { items: [item("progress", "감리 42.5% [1], 업체 43.1% [2]로 서로 다름[1][2]", true)] },
      DOCS,
    );
    assert.equal(
      progress.content,
      "감리 42.5% (한빛청사_감리월간보고서_2026-09), 업체 43.1% (한빛청사_업체월간보고서_2026-09)로 서로 다름 (한빛청사_감리월간보고서_2026-09, 한빛청사_업체월간보고서_2026-09)",
    );
    assert.deepEqual(
      progress.sources.map((s) => s.documentId),
      ["d1", "d2"],
    );
    assert.equal(progress.needsCheck, true); // AI가 표시한 "값이 서로 다름"
  });

  it("문서 종류·작성일을 알면 짧은 이름으로 표시한다", () => {
    const docs: DraftDocument[] = [
      { ...DOCS[0], docKind: "감리보고서" },
      { ...DOCS[1], docKind: "업체월간보고서" },
    ];
    assert.equal(labelOf(docs[0]), "감리보고서 10.5.");
    const [progress] = normalizeDraft({ items: [item("progress", "실적 42.5%임 [1][2].")] }, docs);
    assert.equal(progress.content, "실적 42.5%임 (감리보고서 10.5., 업체월간보고서 10.2.).");
    assert.deepEqual(Object.keys(progress.sources[0]), ["documentId", "fileName", "writtenDate"]); // 저장할 땐 필요한 것만
  });

  it("없는 문서 번호는 지운다 (AI가 지어낸 근거 방지)", () => {
    const [progress] = normalizeDraft({ items: [item("progress", "실적 42.5% [1][7]")] }, DOCS);
    assert.equal(progress.content, "실적 42.5% (한빛청사_감리월간보고서_2026-09)");
    assert.deepEqual(progress.sources.map((s) => s.documentId), ["d1"]);
  });

  it("숫자가 있는데 근거가 없는 문장이 있으면 '확인 필요'", () => {
    const [progress] = normalizeDraft({ items: [item("progress", "실적 42.5% [1]. 계획 대비 0.5%p 앞섬.")] }, DOCS);
    assert.equal(progress.needsCheck, true);
  });

  it("근거 검사: 숫자 문장마다 [번호]가 있어야 통과", () => {
    assert.equal(hasUncitedNumbers("실적 42.5% [1]. 기성 13.8억 [2]."), false);
    assert.equal(hasUncitedNumbers("특이사항 없음 [1]."), false); // 숫자 없는 문장은 상관없음
    assert.equal(hasUncitedNumbers("실적 42.5% [1]\n사고 1건"), true);
  });
});

describe("개인정보", () => {
  it("AI가 개인정보를 옮겨 적어도 마지막에 가린다", () => {
    const [, , , , , wages] = normalizeDraft(
      { items: [item("wages", "근로자 노임 체불 0건 [2]. 문의 010-1234-5678 [2]")] },
      DOCS,
    );
    assert.match(wages.content, /010-\*{4}-5678/);
  });
});
