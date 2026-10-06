// 근거 문서 대조 도우미 시험 (실행: npm test) — PLAN 21번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlight, numbersIn } from "./highlight.ts";

describe("대조할 숫자 뽑기", () => {
  it("단위가 붙은 숫자를 뽑고, 근거 표시 괄호의 날짜와 한 자리 숫자는 뺀다", () => {
    const nums = numbersIn("실적 43.1% (업체월간보고서 10.2.), 감리보고서에는 42.5% (감리보고서 10.5.). 사고 1건.");
    assert.deepEqual(nums.sort(), ["42.5%", "43.1%"]);
  });
  it("금액·날짜·수량", () => {
    const nums = numbersIn("제7회 기성 1,380,000,000원, 9월 17일 사고, 철근 395톤");
    for (const n of ["1,380,000,000원", "17일", "395톤"]) assert.ok(nums.includes(n), n);
  });
});

describe("원문에 표시하기", () => {
  const hits = (text: string, nums: string[]) =>
    highlight(text, nums)
      .filter((s) => s.hit)
      .map((s) => s.text);

  it("찾은 숫자만 표시한다", () => {
    assert.deepEqual(hits("계획 42.0% / 실적 42.5% (계획 대비 +0.5%p)", ["42.5%"]), ["42.5%"]);
  });
  it("더 긴 숫자 안의 일부는 표시하지 않는다", () => {
    assert.deepEqual(hits("142.5%와 42.5%", ["42.5%"]), ["42.5%"]);
    assert.deepEqual(hits("1,380,000,000원", ["380,000,000원"]), []);
  });
  it("나눈 조각을 이으면 원문과 같다", () => {
    const text = "기성 1,380,000,000원 (누계 7,670,000,000원)";
    assert.equal(
      highlight(text, ["1,380,000,000원", "7,670,000,000원"])
        .map((s) => s.text)
        .join(""),
      text,
    );
  });
});
