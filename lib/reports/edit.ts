// 직원이 고친 초안 검사 (DESIGN.md 4.3 흐름 ② 6단계, 6.2 saveReportDraft) — PLAN 21번
// 화면에서 온 수정 내용을 그대로 믿지 않고, 저장된 초안을 바탕으로 내용·확인 표시만 바꾼다.
// - 항목 이름·순서·근거 문서는 바꿀 수 없다 (화면 조작으로 9개 항목 구조가 깨지지 않게)
// - 빈 내용은 "해당 기간 자료 없음"으로, 개인정보는 가림, 너무 긴 글은 막는다
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.
import { maskPersonalInfo } from "../masking.ts";
import { NO_DATA, type ReportItem } from "./items.ts";

/** 항목 하나에 쓸 수 있는 최대 글자 수 */
export const MAX_ITEM_CHARS = 2000;

export type ItemEdit = { key: string; content: string; needsCheck: boolean };

export type EditResult = { ok: true; items: ReportItem[] } | { ok: false; message: string };

export function applyEdits(saved: ReportItem[], edits: ItemEdit[]): EditResult {
  const byKey = new Map(edits.map((e) => [e.key, e]));
  if (byKey.size !== edits.length || edits.some((e) => !saved.some((s) => s.key === e.key))) {
    return { ok: false, message: "보고서 항목이 올바르지 않습니다. 화면을 새로고침해주세요." };
  }

  const items: ReportItem[] = [];
  for (const item of saved) {
    const edit = byKey.get(item.key);
    if (!edit) {
      items.push(item); // 화면에서 보내지 않은 항목은 그대로
      continue;
    }
    const content = edit.content.replace(/\r\n?/g, "\n").trim();
    if (content.length > MAX_ITEM_CHARS) {
      return { ok: false, message: `"${item.title}" 내용이 너무 깁니다. ${MAX_ITEM_CHARS}자 이하로 줄여주세요.` };
    }
    items.push({
      ...item,
      content: content ? maskPersonalInfo(content) : NO_DATA,
      needsCheck: Boolean(edit.needsCheck),
    });
  }
  return { ok: true, items };
}
