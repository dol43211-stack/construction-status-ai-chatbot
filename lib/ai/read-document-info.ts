// AI로 문서 정보 읽기 (서버 전용) — PLAN 17번, DESIGN.md 4.2 흐름 ① 5단계
// 개인정보를 가린 본문과 등록된 공사 목록을 주고, 공사·문서 종류·작성일·대상 기간을 정해진 모양으로 받는다.
// AI가 실패하면 callAi가 AiError를 던진다. (부르는 쪽에서 정보 칸을 비워 두고 직원이 직접 입력하게 한다)
import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import {
  aiDocumentInfoSchema,
  normalizeDocumentInfo,
  type DocumentInfo,
} from "@/lib/documents/document-info";
import { callAi } from "./call.ts";
import { getModel, getOpenAI } from "./openai.ts";

/** 머리 정보는 보통 문서 앞쪽에 있으므로 앞부분만 보낸다 (속도·비용 절약) */
const MAX_CHARS = 6000;

const INSTRUCTIONS = `너는 서울지방조달청 공사관리과의 문서 분류 담당자다.
건설공사 문서 본문을 읽고, 아래 규칙대로 정보를 정해진 모양(JSON)으로만 답한다.

[공사]
- 반드시 "등록된 공사 목록"에서만 고르고 그 번호를 답한다.
- 문서의 공사명이 줄임말이거나 띄어쓰기가 달라도 같은 공사가 분명하면 그 번호를 고른다. (예: "OO청사 신축" → "OO청사 신축공사")
- 목록에 없거나 어느 공사인지 확실하지 않으면 null. 절대 추측하지 않는다.

[문서 종류] 누가 작성했는지로 판단한다. 주기(주간·월간)보다 작성자가 먼저다.
- 감리보고서: 감리단·감리원이 작성한 보고서. 월간이어도 감리보고서다.
  단서: 제목이 "감리"로 시작함, "감리단", "책임감리원" 등이 적혀 있음.
- 업체주간보고서: 시공사(건설업체)가 작성한 주간 보고서
- 업체월간보고서: 시공사(건설업체)가 작성한 월간 보고서 (감리단이 아닌 시공사가 작성)
- 감독지시서: 공사감독관이 시공사에 보낸 지시서
- 기타: 위에 해당하지 않음
- 본문에서 꺼낸 제목은 "감 리 월 간 보 고 서"처럼 글자 사이에 띄어쓰기가 들어가 있을 수 있다. 띄어쓰기를 무시하고 읽는다.

[날짜] 모두 YYYY-MM-DD 형식.
- written_date: 문서를 작성한 날(작성일·지시일자).
- period_start, period_end: 문서가 "다루는" 대상 기간(보고기간). 작성일과 다를 수 있다.
  예) 10월 3일에 작성한 9월분 월간보고서 → written_date 2026-10-03, 대상 기간 2026-09-01 ~ 2026-09-30
- 감독지시서처럼 하루짜리 문서는 대상 기간을 작성일 하루로 한다.
- 본문에 없는 날짜는 지어내지 말고 null.`;

/**
 * 문서 본문에서 정보를 읽어낸다.
 * @param text 개인정보를 가린 본문
 * @param projects 등록된 공사 목록
 */
export async function readDocumentInfo(
  text: string,
  projects: { id: string; name: string }[],
): Promise<DocumentInfo> {
  const projectList = projects.length
    ? projects.map((p, i) => `${i + 1}. ${p.name}`).join("\n")
    : "(등록된 공사 없음)";

  const response = await callAi(
    (signal) =>
      getOpenAI().responses.parse(
        {
          model: getModel(),
          instructions: INSTRUCTIONS,
          input: `[등록된 공사 목록]\n${projectList}\n\n[문서 본문]\n${text.slice(0, MAX_CHARS)}`,
          text: { format: zodTextFormat(aiDocumentInfoSchema, "document_info") },
        },
        { signal },
      ),
    { label: "문서 정보 읽기" },
  );

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("AI 답변을 해석하지 못했습니다.");
  return normalizeDocumentInfo(
    parsed,
    projects.map((p) => p.id),
  );
}
