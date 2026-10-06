// 챗봇 근거 자료 모으기 (서버 전용) — PLAN 27번, DESIGN.md 4.4 흐름 ③ 3단계
// 공사 1건의 "직원이 확인한" 문서를 최근 작성일 순으로 모은다. 너무 길면 오래된 문서부터 뺀다.
import "server-only";

import { getSupabase } from "@/lib/supabase";

/** AI에게 보낼 본문 글자 수 상한 (설계 검토 m-12: 속도·비용 관리) */
export const MAX_CONTEXT_CHARS = 30_000;

export type ChatDocument = {
  fileName: string;
  writtenDate: string | null;
  docKind: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  /** 개인정보를 가린 본문 */
  text: string;
};

export async function loadChatDocuments(projectId: string): Promise<ChatDocument[]> {
  const { data, error } = await getSupabase()
    .from("documents")
    .select("file_name, written_date, doc_kind, period_start, period_end, text")
    .eq("project_id", projectId)
    .eq("confirmed", true)
    .order("written_date", { ascending: false, nullsFirst: false });
  if (error) {
    console.error(`[DB 오류] 챗봇 근거 문서 읽기: ${error.code}`);
    throw new Error("문서를 불러오지 못했습니다.");
  }

  const picked: ChatDocument[] = [];
  let used = 0;
  for (const d of data) {
    if (used + d.text.length > MAX_CONTEXT_CHARS && picked.length > 0) break; // 최신 문서부터 채우고, 넘치면 그만
    picked.push({
      fileName: d.file_name,
      writtenDate: d.written_date,
      docKind: d.doc_kind,
      periodStart: d.period_start,
      periodEnd: d.period_end,
      text: d.text.slice(0, MAX_CONTEXT_CHARS),
    });
    used += d.text.length;
  }
  return picked;
}
