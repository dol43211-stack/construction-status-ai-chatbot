// AI가 읽은 문서 정보 검사·보정 시험 (실행: npm test) — PLAN 17번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDocumentInfo, validDate, type AiDocumentInfo } from "./document-info.ts";

const IDS = ["id-hanbit", "id-nuri", "id-haneul"];
const base: AiDocumentInfo = {
  project_number: 1,
  doc_kind: "감리보고서",
  written_date: "2026-10-05",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
};

describe("날짜 검사", () => {
  it("달력에 있는 YYYY-MM-DD만 받는다", () => {
    assert.equal(validDate("2026-09-30"), "2026-09-30");
    assert.equal(validDate("2026-02-29"), null); // 2026년은 윤년이 아님
    assert.equal(validDate("2026-09-31"), null);
    assert.equal(validDate("2026.09.30"), null);
    assert.equal(validDate("9월 30일"), null);
    assert.equal(validDate(null), null);
  });
});

describe("공사 연결", () => {
  it("목록 번호(1부터)를 공사 id로 바꾼다", () => {
    assert.equal(normalizeDocumentInfo(base, IDS).projectId, "id-hanbit");
    assert.equal(normalizeDocumentInfo({ ...base, project_number: 3 }, IDS).projectId, "id-haneul");
  });
  it("목록 범위를 벗어난 번호는 연결하지 않는다 (AI가 지어낸 공사 방지)", () => {
    for (const n of [0, 4, -1, 99]) {
      assert.equal(normalizeDocumentInfo({ ...base, project_number: n }, IDS).projectId, null);
    }
  });
  it("AI가 모른다고 하면 연결하지 않는다", () => {
    assert.equal(normalizeDocumentInfo({ ...base, project_number: null }, IDS).projectId, null);
  });
});

describe("대상 기간 보정", () => {
  it("정상 값은 그대로", () => {
    assert.deepEqual(normalizeDocumentInfo(base, IDS), {
      projectId: "id-hanbit",
      docKind: "감리보고서",
      writtenDate: "2026-10-05",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    });
  });
  it("감독지시서에 대상 기간이 없으면 작성일 하루로 채운다", () => {
    const info = normalizeDocumentInfo(
      { ...base, doc_kind: "감독지시서", written_date: "2026-09-18", period_start: null, period_end: null },
      IDS,
    );
    assert.equal(info.periodStart, "2026-09-18");
    assert.equal(info.periodEnd, "2026-09-18");
  });
  it("시작일이나 끝일 하나만 있으면 같은 날로 맞춘다", () => {
    const info = normalizeDocumentInfo({ ...base, period_start: "2026-09-18", period_end: null }, IDS);
    assert.equal(info.periodEnd, "2026-09-18");
  });
  it("끝일이 시작일보다 앞이면 둘 다 버린다", () => {
    const info = normalizeDocumentInfo({ ...base, period_start: "2026-09-30", period_end: "2026-09-01" }, IDS);
    assert.equal(info.periodStart, null);
    assert.equal(info.periodEnd, null);
  });
  it("달력에 없는 날짜는 버린다", () => {
    const info = normalizeDocumentInfo({ ...base, written_date: "2026-13-01" }, IDS);
    assert.equal(info.writtenDate, null);
  });
});
