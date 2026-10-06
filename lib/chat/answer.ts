// 챗봇 답변: AI 답의 모양과 코드 검사·보정 (DESIGN.md 4.4 흐름 ③ 4~5단계) — PLAN 27번
// PRD M2 규칙을 AI에게만 맡기지 않고 코드가 한 번 더 지킨다.
//  규칙 1: 올라온 문서 내용만 → 근거 문서가 하나도 없으면 "올라온 자료에서 찾을 수 없습니다."
//  규칙 2: 근거 문서명·작성일 → 실제로 있는 문서 번호만 근거로 인정 (화면이 답변 아래에 붙인다)
//  규칙 3: 5문장 이내 → 넘치면 5문장까지만
//  개인정보: 마지막에 한 번 더 가린다
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.
import { z } from "zod";
import { maskPersonalInfo } from "../masking.ts";
import type { ChatAnswer, ChatSource } from "./types.ts";

export const NOT_FOUND = "올라온 자료에서 찾을 수 없습니다.";
export const NO_PERSONAL_INFO = "개인정보(연락처·주민등록번호·계좌번호 등)는 안내하지 않습니다.";

/**
 * 개인정보를 묻는 질문인지 (PRD 7-②) — 그렇다면 AI를 부르지 않고 정해진 안내를 한다.
 * 예) "재해자 연락처 알려줘", "근로자 주민번호", "노임 지급 계좌번호"
 */
export function asksPersonalInfo(question: string): boolean {
  return /(연락처|전화\s*번호|휴대\s*폰|핸드폰|주민\s*(등록)?\s*번호|계좌\s*번호|계좌)/.test(question);
}
export const MAX_SENTENCES = 5;

/** AI에게 이 모양 그대로 답하라고 요구한다 */
export const aiAnswerSchema = z.object({
  found: z.boolean().describe("제공된 문서에서 답을 찾았으면 true, 없으면 false"),
  answer: z.string().describe("답변. 근거가 된 문장 뒤에 문서 번호를 [1]처럼 붙인다"),
  source_numbers: z.array(z.number().int()).describe("답변의 근거가 된 문서 번호들"),
});
export type AiAnswer = z.infer<typeof aiAnswerSchema>;

const MARKER = /\s*\[(\d+)\]/g;

/** 문장 나누기: 마침표·물음표·느낌표 뒤 띄어쓰기나 줄바꿈 (42.5% 같은 숫자 안의 점은 나누지 않음) */
const sentences = (text: string) =>
  text
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** 근거 문서 (text가 있으면 인용문 검사에 쓴다) */
export type AnswerDocument = ChatSource & { text?: string };

const squash = (s: string) => s.replace(/[\s"'“”‘’「」『』]/g, "");

/**
 * 인용문 검사: 답변이 따옴표로 옮긴 말("…")이 근거 문서 어디에도 없으면 true
 * AI가 다른 문서의 문구를 이 문서에 적혀 있는 것처럼 지어내는 것을 막는다.
 */
export function hasFakeQuote(answer: string, citedTexts: string[]): boolean {
  const quotes = [...answer.matchAll(/["“‘'「『]([^"”’'」』]{4,})["”’'」』]/g)].map((m) => squash(m[1]));
  const haystack = citedTexts.map(squash);
  return quotes.some((q) => !haystack.some((t) => t.includes(q)));
}

export function normalizeAnswer(ai: AiAnswer, docs: AnswerDocument[]): ChatAnswer {
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= docs.length;
  const cited = [...ai.answer.matchAll(MARKER)].map((m) => Number(m[1]));
  const numbers = [...new Set([...ai.source_numbers, ...cited].filter(valid))].sort((a, b) => a - b);

  const text = ai.answer.replace(MARKER, "").replace(/[ \t]+/g, " ").trim();
  if (!ai.found || numbers.length === 0 || !text) return { answer: NOT_FOUND, sources: [] };

  // 근거 문서 본문을 알면, 따옴표 인용이 실제로 그 문서에 있는지 확인한다
  const citedTexts = numbers.map((n) => docs[n - 1].text).filter((t): t is string => t !== undefined);
  if (citedTexts.length === numbers.length && hasFakeQuote(text, citedTexts)) {
    console.error("[챗봇] 근거 문서에 없는 인용문이 있어 답변을 버림");
    return { answer: NOT_FOUND, sources: [] };
  }

  return {
    answer: maskPersonalInfo(sentences(text).slice(0, MAX_SENTENCES).join(" ")),
    sources: numbers.map((n) => ({ fileName: docs[n - 1].fileName, writtenDate: docs[n - 1].writtenDate })),
  };
}
