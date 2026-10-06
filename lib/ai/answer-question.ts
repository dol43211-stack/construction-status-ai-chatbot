// AI로 챗봇 답변 만들기 (서버 전용) — PLAN 27번, DESIGN.md 4.4 흐름 ③ 4단계
// 공사 1건의 확인된 문서(개인정보 가림 완료)와 질문을 주고, 정해진 모양으로 답을 받는다.
// AI 답은 normalizeAnswer가 코드로 한 번 더 검사·보정한다.
import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { aiAnswerSchema, MAX_SENTENCES, normalizeAnswer, NOT_FOUND } from "@/lib/chat/answer";
import type { ChatAnswer, ChatTurn } from "@/lib/chat/types";
import type { ChatDocument } from "@/lib/data/chat-documents";
import { callAi } from "./call.ts";
import { getModel, getOpenAI } from "./openai.ts";

/** 챗봇은 화면이 1분까지 기다리므로, 그보다 조금 짧게 끊는다 */
const CHAT_AI_TIMEOUT_MS = 50_000;

const INSTRUCTIONS = `너는 서울지방조달청 공사관리과의 공사 현황 안내 담당자다.
제공된 문서만 근거로 질문에 답한다. 아래 규칙을 반드시 지킨다.

1. 제공된 문서에 있는 내용만 답한다. 문서에 없으면 found를 false로 하고 answer에 "${NOT_FOUND}"라고만 쓴다.
   추측하거나 일반 지식으로 채우지 않는다.
   질문한 항목(예: 건설사고)이 문서에 없으면, 비슷한 다른 항목(예: 하자) 내용으로 대신 답하지 말고 found를 false로 한다.
2. 근거가 된 문장 뒤에 문서 번호를 [1]처럼 붙이고, source_numbers에도 넣는다.
3. ${MAX_SENTENCES}문장 이내로 짧게 답한다. 존댓말(~입니다)로 쓴다.
4. 숫자(공정률 %, 금액, 건수, 날짜)는 문서에 적힌 그대로 쓴다. 계산하거나 반올림하지 않는다.
5. 질문에 기간(예: 9월, 이번 주)이 있으면 그 기간을 다룬 문서를 쓴다. 기간이 없으면 가장 최근 문서를 쓰고 어느 기간 자료인지 밝힌다.
   (오늘 날짜를 모르므로 "이번 달"은 가장 최근 문서의 기간으로 본다)
6. 같은 내용인데 문서끼리 값이 다르면 두 값을 모두 근거와 함께 알리고 "확인이 필요합니다"라고 덧붙인다.
7. 문서에 언급이 아예 없는 항목은 "0건"이나 "없음"으로 단정하지 말고, 그 기간 자료에서 찾을 수 없다고 답한다.
8. 개인정보(이름, 주민등록번호, 전화번호, 계좌번호)는 답하지 않는다.
9. 문서 문구를 따옴표("…")로 옮길 때는 그 문서에 글자 그대로 있는 문구만 옮긴다.
10. 답변 글에서 문서를 "문서 1"처럼 번호로 부르지 말고 "감리보고서", "업체 월간보고서"처럼 종류로 부른다. (번호는 [1] 표시에만 쓴다)`;

/** 공사 1건의 문서로 질문에 답한다. AI가 실패하면 AiError를 던진다. */
export async function answerQuestion(input: {
  projectName: string;
  question: string;
  history: ChatTurn[];
  documents: ChatDocument[];
}): Promise<ChatAnswer> {
  const period = (d: ChatDocument) =>
    d.periodStart && d.periodEnd ? (d.periodStart === d.periodEnd ? d.periodStart : `${d.periodStart} ~ ${d.periodEnd}`) : "모름";
  const docs = input.documents
    .map(
      (d, i) =>
        `[문서 ${i + 1}] ${d.fileName} / 종류: ${d.docKind ?? "모름"} / 작성일: ${d.writtenDate ?? "모름"} / 대상 기간: ${period(d)}\n${d.text}`,
    )
    .join("\n\n");
  const history = input.history.length
    ? `[앞선 대화]\n${input.history.map((t) => `${t.role === "user" ? "질문" : "답변"}: ${t.text}`).join("\n")}\n\n`
    : "";

  const response = await callAi(
    (signal) =>
      getOpenAI().responses.parse(
        {
          model: getModel(),
          instructions: INSTRUCTIONS,
          input: `[공사] ${input.projectName}\n\n${docs}\n\n${history}[질문] ${input.question}`,
          text: { format: zodTextFormat(aiAnswerSchema, "chat_answer") },
        },
        { signal },
      ),
    { label: "챗봇", timeoutMs: CHAT_AI_TIMEOUT_MS },
  );

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("AI 답변을 해석하지 못했습니다.");
  return normalizeAnswer(
    parsed,
    input.documents.map((d) => ({ fileName: d.fileName, writtenDate: d.writtenDate, text: d.text })),
  );
}
