// AI가 읽은 문서 정보 검사·보정 시험 (실행: npm test) — PLAN 17번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkConfirmable,
  normalizeDocumentInfo,
  validDate,
  type AiDocumentInfo,
  type DocumentInfoInput,
} from "./document-info.ts";

describe("직원이 [확인]을 누를 때의 검사 (PLAN 18번)", () => {
  const ok: DocumentInfoInput = {
    projectId: "id-hanbit",
    docKind: "감리보고서",
    writtenDate: "2026-10-05",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  };
  const ids = ["id-hanbit", "id-nuri"];

  it("네 칸이 모두 올바르면 통과", () => {
    assert.equal(checkConfirmable(ok, ids), null);
  });
  it("빈 칸이 하나라도 있으면 막는다", () => {
    assert.equal(checkConfirmable({ ...ok, projectId: "" }, ids), "공사를 골라주세요.");
    assert.equal(checkConfirmable({ ...ok, docKind: "" }, ids), "문서 종류를 골라주세요.");
    assert.equal(checkConfirmable({ ...ok, writtenDate: "" }, ids), "작성일을 입력해주세요.");
    assert.equal(checkConfirmable({ ...ok, periodEnd: "" }, ids), "대상 기간의 시작일과 끝일을 입력해주세요.");
  });
  it("등록되지 않은 공사, 정해진 종류 밖의 값, 거꾸로 된 기간은 막는다", () => {
    assert.equal(checkConfirmable({ ...ok, projectId: "id-unknown" }, ids), "등록된 공사 중에서 골라주세요.");
    assert.equal(checkConfirmable({ ...ok, docKind: "설계도면" }, ids), "문서 종류를 골라주세요.");
    assert.equal(
      checkConfirmable({ ...ok, periodStart: "2026-09-30", periodEnd: "2026-09-01" }, ids),
      "대상 기간의 끝일이 시작일보다 앞설 수 없습니다.",
    );
  });
});

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
