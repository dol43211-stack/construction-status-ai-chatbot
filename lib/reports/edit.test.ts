// 직원이 고친 초안 검사 시험 (실행: npm test) — PLAN 21번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyEdits, MAX_ITEM_CHARS } from "./edit.ts";
import { NO_DATA, REPORT_ITEMS, type ReportItem } from "./items.ts";

const SAVED: ReportItem[] = REPORT_ITEMS.map(({ key, title }) => ({
  key,
  title,
  content: `${title} 원래 내용`,
  sources: [{ documentId: "d1", fileName: "감리.pdf", writtenDate: "2026-10-05" }],
  needsCheck: key === "progress",
}));

describe("직원 수정 반영", () => {
  it("내용과 확인 표시만 바꾸고, 이름·순서·근거 문서는 그대로 둔다", () => {
    const result = applyEdits(SAVED, [{ key: "progress", content: " 실적 42.5%로 확정 (감리보고서 10.5.) ", needsCheck: false }]);
    assert.ok(result.ok);
    assert.equal(result.items[0].content, "실적 42.5%로 확정 (감리보고서 10.5.)");
    assert.equal(result.items[0].needsCheck, false);
    assert.deepEqual(result.items[0].sources, SAVED[0].sources);
    assert.deepEqual(result.items.map((i) => i.key), SAVED.map((i) => i.key));
    assert.deepEqual(result.items[1], SAVED[1]); // 보내지 않은 항목은 그대로
  });

  it("내용을 모두 지우면 '해당 기간 자료 없음'", () => {
    const result = applyEdits(SAVED, [{ key: "accident", content: "  \n ", needsCheck: false }]);
    assert.ok(result.ok);
    assert.equal(result.items[7].content, NO_DATA);
  });

  it("직원이 붙여넣은 개인정보도 가린다", () => {
    const result = applyEdits(SAVED, [{ key: "accident", content: "재해자 연락처 010-1234-5678", needsCheck: false }]);
    assert.ok(result.ok);
    assert.equal(result.items[7].content, "재해자 연락처 010-****-5678");
  });
});

describe("막아야 하는 수정", () => {
  it("없는 항목이나 같은 항목을 두 번 보내면 막는다", () => {
    assert.equal(applyEdits(SAVED, [{ key: "hacked", content: "x", needsCheck: false }]).ok, false);
    assert.equal(
      applyEdits(SAVED, [
        { key: "progress", content: "a", needsCheck: false },
        { key: "progress", content: "b", needsCheck: false },
      ]).ok,
      false,
    );
  });
  it(`${MAX_ITEM_CHARS}자를 넘으면 막는다`, () => {
    const result = applyEdits(SAVED, [{ key: "issues", content: "가".repeat(MAX_ITEM_CHARS + 1), needsCheck: false }]);
    assert.deepEqual(result, { ok: false, message: `"주요 이슈" 내용이 너무 깁니다. ${MAX_ITEM_CHARS}자 이하로 줄여주세요.` });
  });
});
