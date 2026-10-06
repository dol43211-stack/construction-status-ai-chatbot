// 질문의 공사 찾기 시험 (실행: npm test) — PLAN 27번
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchProject } from "./match-project.ts";

const P = [
  { id: "h", name: "한빛청사 신축공사" },
  { id: "n", name: "누리초등학교 증축공사" },
  { id: "s", name: "하늘마루 복합문화센터 건립공사" },
];
const pick = (q: string, earlier: string[] = []) => {
  const m = matchProject(q, earlier, P);
  return m.kind === "one" ? m.project.id : `ask:${m.candidates.map((c) => c.id).join(",")}`;
};

describe("질문에서 공사 찾기", () => {
  it("정식 이름, 띄어쓰기 없이, 첫 낱말만", () => {
    assert.equal(pick("한빛청사 신축공사 9월 공정률은?"), "h");
    assert.equal(pick("한빛청사신축공사 공정률"), "h");
    assert.equal(pick("하늘마루 노임 체불 있어?"), "s");
  });
  it("줄인 이름과 조사가 붙은 이름", () => {
    assert.equal(pick("누리초 8월 사고 있었나요?"), "n");
    assert.equal(pick("누리초는 하자 있었어?"), "n");
    assert.equal(pick("한빛청사의 기성 실적"), "h");
  });
  it("공사명이 없으면 되묻는다 (모든 공사를 보기로)", () => {
    assert.equal(pick("이번 달 공정률은?"), "ask:h,n,s");
  });
  it("두 공사 이상이면 그 공사들만 보기로 되묻는다", () => {
    assert.equal(pick("한빛청사랑 누리초 공정률 비교해줘"), "ask:h,n");
  });
  it("'공사', '청사' 같은 흔한 낱말만으로는 고르지 않는다", () => {
    assert.equal(pick("공사 현황 알려줘"), "ask:h,n,s");
  });
});

describe("앞 대화 이어가기", () => {
  it("질문에 공사가 없으면 가장 최근 질문의 공사를 쓴다", () => {
    assert.equal(pick("그럼 기성 실적은?", ["누리초 8월 공정률은?"]), "n");
    assert.equal(pick("사고는?", ["누리초 공정률은?", "한빛청사 공정률은?"]), "h");
  });
  it("지금 질문의 공사가 앞 대화보다 우선", () => {
    assert.equal(pick("하늘마루는?", ["한빛청사 공정률은?"]), "s");
  });
});
