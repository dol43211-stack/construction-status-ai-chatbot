// 질문의 달로 문서 좁히기 시험 (실행: npm test) — PLAN 27번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterByQuestionMonth, monthInQuestion } from "./month-filter.ts";

const doc = (name: string, periodStart: string, periodEnd: string, writtenDate: string) => ({ name, periodStart, periodEnd, writtenDate });
const DOCS = [
  doc("감리 8월", "2026-08-01", "2026-08-31", "2026-09-04"),
  doc("감리 9월", "2026-09-01", "2026-09-30", "2026-10-05"),
  doc("주간 8/24~30", "2026-08-24", "2026-08-30", "2026-08-31"),
  doc("주간 9/28~10/4", "2026-09-28", "2026-10-04", "2026-10-05"),
  doc("지시서 9/22", "2026-09-22", "2026-09-22", "2026-09-22"),
];
const names = (q: string) => filterByQuestionMonth(q, DOCS).map((d) => d.name);

describe("질문에서 달 찾기", () => {
  it("달, 연·달, 달 없음", () => {
    assert.deepEqual(monthInQuestion("누리초 8월 사고?"), { year: null, month: 8 });
    assert.deepEqual(monthInQuestion("2026년 9월 기성"), { year: 2026, month: 9 });
    assert.equal(monthInQuestion("이번 달 공정률"), null);
    assert.equal(monthInQuestion("13월"), null);
  });
});

describe("그 달을 다룬 문서만", () => {
  it("8월 질문에는 9월 문서가 빠진다 (작성일이 9월이어도 8월분은 남는다)", () => {
    assert.deepEqual(names("8월에 건설사고 있었어?"), ["감리 8월", "주간 8/24~30"]);
  });
  it("9월 질문: 9월에 걸친 주간과 하루짜리 지시서도 포함", () => {
    assert.deepEqual(names("9월 공정률"), ["감리 9월", "주간 9/28~10/4", "지시서 9/22"]);
  });
  it("달이 없으면 모두", () => {
    assert.equal(names("공정률은?").length, DOCS.length);
  });
  it("그 달 문서가 없으면 빈 목록", () => {
    assert.deepEqual(names("3월 공정률"), []);
  });
});
