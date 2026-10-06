// 보고 기간 계산과 문서 고르기 시험 (실행: npm test) — PLAN 19번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTRACTOR_WRITTEN_OVERRIDE, MONTHLY_WRITTEN, PROJECTS } from "../../samples/sample-data.mjs";
import { belongsToReport, daysIn, monthOf, reportPeriod, weekOf, type Period } from "./period.ts";

describe("주간: 월요일~일요일", () => {
  it("어느 요일을 골라도 그 주 월~일", () => {
    for (const day of ["2026-09-14", "2026-09-16", "2026-09-20"]) {
      assert.deepEqual(weekOf(day), { start: "2026-09-14", end: "2026-09-20" });
    }
  });
  it("달이 바뀌는 주", () => {
    assert.deepEqual(weekOf("2026-10-01"), { start: "2026-09-28", end: "2026-10-04" });
  });
  it("해가 바뀌는 주", () => {
    assert.deepEqual(weekOf("2027-01-01"), { start: "2026-12-28", end: "2027-01-03" });
  });
});

describe("월간: 1일~말일", () => {
  it("30일·31일·2월", () => {
    assert.deepEqual(monthOf("2026-09"), { start: "2026-09-01", end: "2026-09-30" });
    assert.deepEqual(monthOf("2026-08"), { start: "2026-08-01", end: "2026-08-31" });
    assert.deepEqual(monthOf("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
    assert.deepEqual(monthOf("2028-02"), { start: "2028-02-01", end: "2028-02-29" }); // 윤년
  });
  it("잘못된 입력은 null", () => {
    assert.equal(reportPeriod("monthly", "2026-13"), null);
    assert.equal(reportPeriod("weekly", "2026-09"), null);
    assert.equal(reportPeriod("weekly", "어제"), null);
  });
  it("기간의 날 수", () => {
    assert.equal(daysIn(monthOf("2026-09")), 30);
    assert.equal(daysIn(weekOf("2026-09-14")), 7);
  });
});

describe("문서 고르기 규칙", () => {
  const sept = monthOf("2026-09");
  const week = weekOf("2026-09-14");

  it("10월 3일에 작성된 9월분 월간보고서는 9월 보고서에 들어간다 (작성일이 아니라 대상 기간)", () => {
    assert.ok(belongsToReport({ start: "2026-09-01", end: "2026-09-30" }, sept));
  });
  it("9월 월간보고서는 9월 중 한 주의 주간 보고서에는 들어가지 않는다 (더 긴 기간)", () => {
    assert.ok(!belongsToReport({ start: "2026-09-01", end: "2026-09-30" }, weekOf("2026-09-01")));
  });
  it("하루짜리 감독지시서는 그날이 속한 주·달에 들어간다", () => {
    const order: Period = { start: "2026-09-18", end: "2026-09-18" };
    assert.ok(belongsToReport(order, week));
    assert.ok(belongsToReport(order, sept));
    assert.ok(!belongsToReport(order, weekOf("2026-09-21")));
  });
  it("다른 달의 문서는 들어가지 않는다", () => {
    assert.ok(!belongsToReport({ start: "2026-08-01", end: "2026-08-31" }, sept));
  });
});

describe("샘플 문서로 고르기", () => {
  /** 샘플 데이터에서 공사 하나의 모든 문서와 대상 기간 */
  function docsOf(key: string) {
    const p = PROJECTS.find((x) => x.key === key)!;
    const docs: { name: string; period: Period }[] = [];
    const overrides: Record<string, string> = CONTRACTOR_WRITTEN_OVERRIDE;
    const written: Record<string, { contractor: string }> = MONTHLY_WRITTEN;
    for (const ym of Object.keys(p.months)) {
      docs.push({ name: `감리월간 ${ym}`, period: monthOf(ym) });
      docs.push({ name: `업체월간 ${ym} (작성 ${overrides[`${key}:${ym}`] ?? written[ym].contractor})`, period: monthOf(ym) });
    }
    for (const w of p.weeks) docs.push({ name: `업체주간 ${w.start}`, period: { start: w.start, end: w.end } });
    for (const o of p.orders) docs.push({ name: `감독지시서 ${o.date}`, period: { start: o.date, end: o.date } });
    return docs;
  }
  const pick = (key: string, report: Period) =>
    docsOf(key)
      .filter((d) => belongsToReport(d.period, report))
      .map((d) => d.name);

  it("하늘마루 9월 월간: 감리·업체 월간(10/3 작성 포함), 9월 주간 2개, 9월 감독지시서", () => {
    assert.deepEqual(pick("haneul", monthOf("2026-09")), [
      "감리월간 2026-09",
      "업체월간 2026-09 (작성 2026-10-03)",
      "업체주간 2026-09-07",
      "업체주간 2026-09-21",
      "감독지시서 2026-09-30",
    ]);
  });
  it("한빛청사 9월 14~20일 주간: 그 주의 감독지시서(9/18)만", () => {
    assert.deepEqual(pick("hanbit", weekOf("2026-09-16")), ["감독지시서 2026-09-18"]);
  });
  it("누리초 8월 10~16일 주간: 그 주의 업체 주간보고서만", () => {
    assert.deepEqual(pick("nuri", weekOf("2026-08-10")), ["업체주간 2026-08-10"]);
  });
  it("문서가 없는 기간", () => {
    assert.deepEqual(pick("nuri", monthOf("2026-07")), []);
  });
});
