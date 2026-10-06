// 챗봇 답변 검사·보정 시험 (실행: npm test) — PLAN 27번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asksPersonalInfo, MAX_SENTENCES, normalizeAnswer, NOT_FOUND } from "./answer.ts";

const DOCS = [
  { fileName: "한빛청사_감리월간보고서_2026-09.pdf", writtenDate: "2026-10-05" },
  { fileName: "한빛청사_업체월간보고서_2026-09.xlsx", writtenDate: "2026-10-02" },
];

describe("근거 문서", () => {
  it("[번호]는 답변 글에서 빼고, 근거 목록으로 옮긴다", () => {
    const a = normalizeAnswer({ found: true, answer: "9월 실적 공정률은 42.5%입니다 [1].", source_numbers: [] }, DOCS);
    assert.equal(a.answer, "9월 실적 공정률은 42.5%입니다.");
    assert.deepEqual(a.sources, [DOCS[0]]);
  });
  it("본문 번호와 목록 번호를 합치고, 없는 번호는 버린다", () => {
    const a = normalizeAnswer({ found: true, answer: "감리 42.5% [1], 업체 43.1% [2][9].", source_numbers: [2, 5] }, DOCS);
    assert.deepEqual(a.sources, DOCS);
  });
});

describe("자료에서 찾을 수 없음 (PRD M2 규칙 1)", () => {
  it("AI가 못 찾았다고 하면", () => {
    assert.deepEqual(normalizeAnswer({ found: false, answer: "자료가 없습니다.", source_numbers: [] }, DOCS), {
      answer: NOT_FOUND,
      sources: [],
    });
  });
  it("찾았다고 해도 근거 문서가 하나도 없으면 (지어낸 답 방지)", () => {
    const a = normalizeAnswer({ found: true, answer: "공정률은 50%입니다.", source_numbers: [7] }, DOCS);
    assert.equal(a.answer, NOT_FOUND);
  });
});

describe("인용문 검사 (지어낸 인용 막기)", () => {
  const withText = [
    { ...DOCS[0], text: "8. 건설사고 현황\n(이 달에는 사고 항목 없음)" },
    { ...DOCS[1], text: "시공실패 및 하자 | 2층 복도 바닥 타일 들뜸 12장" },
  ];
  it("근거 문서에 없는 인용이면 '찾을 수 없음'으로 바꾼다 (실제 시험에서 나온 사례)", () => {
    const a = normalizeAnswer(
      { found: true, answer: '8월 자료에 모두 “건설사고 없음 (0건)”으로 기재되어 있습니다 [1].', source_numbers: [1] },
      withText,
    );
    assert.deepEqual(a, { answer: NOT_FOUND, sources: [] });
  });
  it("근거 문서에 실제로 있는 인용은 그대로 둔다 (띄어쓰기 차이는 무시)", () => {
    const a = normalizeAnswer(
      { found: true, answer: "하자는 “2층 복도 바닥타일 들뜸 12장”입니다 [2].", source_numbers: [2] },
      withText,
    );
    assert.equal(a.answer, "하자는 “2층 복도 바닥타일 들뜸 12장”입니다.");
    assert.deepEqual(Object.keys(a.sources[0]), ["fileName", "writtenDate"]); // 본문은 화면으로 보내지 않음
  });
});

describe("개인정보를 묻는 질문", () => {
  it("연락처·주민번호·계좌를 묻는 질문을 알아본다", () => {
    for (const q of ["한빛청사 재해자 연락처 알려줘", "근로자 주민번호", "노임 지급 계좌번호는?", "담당자 전화 번호"]) {
      assert.ok(asksPersonalInfo(q), q);
    }
  });
  it("평범한 질문은 해당하지 않는다", () => {
    for (const q of ["한빛청사 9월 공정률은?", "노임 체불 현황", "건설사고 있었어?"]) assert.ok(!asksPersonalInfo(q), q);
  });
});

describe("5문장 이내, 개인정보 가림", () => {
  it(`${MAX_SENTENCES}문장을 넘으면 자른다 (숫자 안의 점은 문장 끝이 아님)`, () => {
    const long = "실적 42.5%입니다. 둘. 셋. 넷. 다섯. 여섯. 일곱.";
    const a = normalizeAnswer({ found: true, answer: long, source_numbers: [1] }, DOCS);
    assert.equal(a.answer, "실적 42.5%입니다. 둘. 셋. 넷. 다섯.");
  });
  it("답변에 개인정보가 섞이면 가린다", () => {
    const a = normalizeAnswer({ found: true, answer: "담당자 연락처는 010-1234-5678입니다 [1].", source_numbers: [] }, DOCS);
    assert.equal(a.answer, "담당자 연락처는 010-****-5678입니다.");
  });
});
