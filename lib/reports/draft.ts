// 보고서 초안: AI 답의 모양과 코드 검사·보정 (DESIGN.md 4.3 흐름 ② 3~4단계) — PLAN 20번
// PRD M1 규칙을 AI에게만 맡기지 않고 코드가 한 번 더 지킨다. (DESIGN.md 1장 원칙 2)
//  규칙 1: 9개 항목을 같은 순서로 모두 → 빠진 항목은 채우고 순서를 맞춘다
//  규칙 2: 내용이 없으면 "해당 기간 자료 없음" → 빈 항목을 이 문구로 바꾼다
//  규칙 3: 숫자에는 근거 문서명 → AI가 쓴 [번호]를 실제 문서 이름으로 바꾸고, 근거 없는 숫자 문장은 "확인 필요"
//  규칙 5: 문서끼리 값이 다르면 "확인 필요" → AI 표시를 그대로 살린다
//  개인정보: 마지막에 한 번 더 가린다 (PRD 7-②)
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.
import { z } from "zod";
import { maskPersonalInfo } from "../masking.ts";
import { NO_DATA, REPORT_ITEM_KEYS, REPORT_ITEMS, type ItemSource, type ReportItem } from "./items.ts";

/** AI에게 이 모양 그대로 답하라고 요구한다 */
export const aiDraftSchema = z.object({
  items: z.array(
    z.object({
      key: z.enum(REPORT_ITEM_KEYS),
      content: z.string().describe("항목 내용. 숫자·사실 바로 뒤에 근거 문서 번호를 [1]처럼 붙인다"),
      needs_check: z.boolean().describe("문서끼리 값이 서로 달라 담당자 확인이 필요하면 true"),
    }),
  ),
});
export type AiDraft = z.infer<typeof aiDraftSchema>;

/** AI에게 보여준 문서 (번호는 1부터) */
export type DraftDocument = ItemSource & { docKind?: string | null };

const MARKER_GROUP = /(?:\s*\[\d+\])+/g; // "[1]" 또는 "[1][3]" 묶음
const MARKER = /\[(\d+)\]/g;
const HAS_MARKER = /\[\d+\]/; // 들어 있는지만 볼 때 (g가 없어야 결과가 매번 같다)

/**
 * 본문에 넣는 짧은 근거 표시: "감리보고서 10.5." (문서 종류 + 작성일)
 * 보고서는 공사 1건짜리라 공사명은 빼도 알아볼 수 있다. 종류·작성일을 모르면 파일 이름(확장자 제외)을 쓴다.
 */
export function labelOf(doc: DraftDocument): string {
  const m = doc.writtenDate ? /^\d{4}-(\d{2})-(\d{2})$/.exec(doc.writtenDate) : null;
  if (doc.docKind && m) return `${doc.docKind} ${Number(m[1])}.${Number(m[2])}.`;
  return doc.fileName.replace(/\.(pdf|xlsx|hwpx)$/i, "");
}

/** "해당 기간 자료 없음"과 같은 뜻으로 볼 답 */
const isNoData = (text: string) => !text.trim() || text.replace(/[\s.。]/g, "") === NO_DATA.replace(/\s/g, "");

/**
 * 근거 표시 검사 (설계 검토 I-4): 숫자가 들어간 문장에 [번호]가 하나도 없으면 true
 * 문장은 마침표 뒤 띄어쓰기나 줄바꿈으로 나눈다. (42.5%처럼 숫자 안의 마침표는 나누지 않는다)
 */
export function hasUncitedNumbers(content: string): boolean {
  return content
    .split(/(?<=[.!?。])\s+|\n+/)
    .some((sentence) => /\d/.test(sentence.replace(MARKER, "")) && !HAS_MARKER.test(sentence));
}

/** AI 초안을 검사·보정해 저장할 9개 항목으로 바꾼다 */
export function normalizeDraft(ai: AiDraft, docs: DraftDocument[]): ReportItem[] {
  return REPORT_ITEMS.map(({ key, title }) => {
    const found = ai.items.find((i) => i.key === key);
    if (!found || isNoData(found.content)) return { key, title, content: NO_DATA, sources: [], needsCheck: false };

    // 실제로 있는 문서 번호만 근거로 인정한다 (AI가 없는 문서 번호를 지어내지 못하게)
    const valid = (n: number) => n >= 1 && n <= docs.length;
    const used = [...new Set([...found.content.matchAll(MARKER)].map((m) => Number(m[1])).filter(valid))];

    const content = found.content
      .replace(MARKER_GROUP, (group) => {
        const nums = [...new Set([...group.matchAll(MARKER)].map((m) => Number(m[1])).filter(valid))];
        return nums.length ? ` (${nums.map((n) => labelOf(docs[n - 1])).join(", ")})` : "";
      })
      .replace(/[ \t]+\n/g, "\n")
      .trim();

    return {
      key,
      title,
      content: maskPersonalInfo(content),
      sources: used.map((n) => {
        const { documentId, fileName, writtenDate } = docs[n - 1];
        return { documentId, fileName, writtenDate };
      }),
      needsCheck: found.needs_check || hasUncitedNumbers(found.content),
    };
  });
}
