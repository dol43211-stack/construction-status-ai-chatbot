// AI로 보고서 초안 쓰기 (서버 전용) — PLAN 20번, DESIGN.md 4.3 흐름 ② 3단계
// 고른 문서들의 본문(개인정보 가림 완료)을 번호와 함께 주고, 9개 항목을 정해진 모양으로 받는다.
// AI 답은 normalizeDraft가 코드로 한 번 더 검사·보정한다.
import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { aiDraftSchema, normalizeDraft, type DraftDocument } from "@/lib/reports/draft";
import { NO_DATA, REPORT_ITEMS, type ReportItem } from "@/lib/reports/items";
import { formatPeriod, type Period, type PeriodType } from "@/lib/reports/period";
import { callAi } from "./call.ts";
import { getModel, getOpenAI } from "./openai.ts";

/** 문서 하나당 본문을 이만큼까지만 보낸다 (속도·비용 절약, 샘플 문서는 1천 자 안팎) */
const MAX_CHARS_PER_DOC = 8000;

const ITEM_GUIDE = REPORT_ITEMS.map((i, n) => `${n + 1}. ${i.key}: ${i.title}`).join("\n");

const INSTRUCTIONS = `너는 서울지방조달청 공사관리과의 건설공사 진행현황 보고서 작성 담당자다.
제공된 문서만 근거로 공사 1건의 보고서 초안을 쓴다. 아래 규칙을 반드시 지킨다.

[항목] 다음 9개 항목을 이 순서대로 모두 쓴다.
${ITEM_GUIDE}

[규칙]
1. 문서에 내용이 없는 항목은 지어내지 말고 content를 정확히 "${NO_DATA}"로 쓴다.
   - 문서에 그 항목의 언급이 아예 없으면 "${NO_DATA}"다. "0건", "없음"은 문서에 그렇게 적혀 있을 때만 쓴다.
2. 숫자(공정률 %, 금액, 건수, 날짜, 수량)가 들어간 문장마다 근거 문서 번호를 [1]처럼 붙인다.
   - 기본은 문장 끝에 한 번만 붙인다. 예) 제7회 기성 1,380,000,000원, 누계 7,670,000,000원임 [1][2].
   - 한 문장 안의 숫자가 서로 다른 문서에서 왔으면 그 숫자 바로 뒤에 각각 붙인다.
   - 근거 없는 숫자는 쓰지 않는다.
3. 숫자는 문서에 적힌 그대로 옮긴다. 계산하거나 반올림하지 않는다.
   문서에 없는 해석·평가·추측("~로 보임", "~확인됨" 같은 덧붙임)은 쓰지 않는다.
4. 같은 항목인데 문서끼리 값이 다르면, 두 값을 모두 근거와 함께 적고 끝에 "(확인 필요)"를 붙이고 needs_check를 true로 한다.
   예) 실적 42.5% [1], 43.1% [2]로 문서 간 차이 (확인 필요)
5. 같은 내용이 여러 문서에 똑같이 있으면 한 번만 쓰고 근거를 [1][2]처럼 함께 붙인다.
6. 주간 보고서의 공정률처럼 시점이 다른 값이 여러 개면 가장 최근 값을 중심으로 쓰고 변화를 짧게 덧붙인다.
7. 개인정보(이름, 주민등록번호, 전화번호, 계좌번호)는 쓰지 않는다. 문서에 가려진 번호(*)가 있어도 옮겨 적지 않는다.
8. 항목마다 1~3문장, 공문서 말투(~함, ~임)로 간결하게 쓴다.`;

export type GenerateInput = {
  projectName: string;
  periodType: PeriodType;
  period: Period;
  /** 보고서에 쓸 문서 (본문은 개인정보를 가린 것) */
  documents: (DraftDocument & { docKind: string | null; period: Period; text: string })[];
};

/** 문서들로 9개 항목 초안을 만든다. AI가 실패하면 AiError를 던진다. */
export async function generateDraft(input: GenerateInput): Promise<ReportItem[]> {
  const header = `[보고서] ${input.projectName} / ${input.periodType === "weekly" ? "주간" : "월간"} / 보고 기간 ${formatPeriod(input.period)}`;
  const docs = input.documents
    .map(
      (d, i) =>
        `[문서 ${i + 1}] ${d.fileName} / 종류: ${d.docKind ?? "모름"} / 작성일: ${d.writtenDate ?? "모름"} / 대상 기간: ${formatPeriod(d.period)}\n${d.text.slice(0, MAX_CHARS_PER_DOC)}`,
    )
    .join("\n\n");

  const response = await callAi(
    (signal) =>
      getOpenAI().responses.parse(
        {
          model: getModel(),
          instructions: INSTRUCTIONS,
          input: `${header}\n\n${docs}`,
          text: { format: zodTextFormat(aiDraftSchema, "report_draft") },
        },
        { signal },
      ),
    { label: "보고서 초안" },
  );

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("AI 답변을 해석하지 못했습니다.");
  return normalizeDraft(
    parsed,
    input.documents.map(({ documentId, fileName, writtenDate, docKind }) => ({ documentId, fileName, writtenDate, docKind })),
  );
}
