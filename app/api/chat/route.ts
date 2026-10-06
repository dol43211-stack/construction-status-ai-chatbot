// POST /api/chat — 챗봇 답변 (DESIGN.md 4.4 흐름 ③, 6.1) — PLAN 27번
// 처리 순서: 질문 검사 → 어느 공사인지 찾기(코드) → 모르면 되묻기
//           → 그 공사의 확인된 문서 모으기(질문에 달이 있으면 그 달 문서만)
//           → AI 답변 → 코드 검사(근거·인용문·5문장·개인정보) → 답변
import { answerQuestion } from "@/lib/ai/answer-question";
import { AI_RETRY_MESSAGE, AiError } from "@/lib/ai/errors";
import { asksPersonalInfo, NO_PERSONAL_INFO, NOT_FOUND } from "@/lib/chat/answer";
import { matchProject } from "@/lib/chat/match-project";
import { filterByQuestionMonth } from "@/lib/chat/month-filter";
import { HISTORY_TURNS, MAX_QUESTION_CHARS, type ChatAnswer, type ChatTurn } from "@/lib/chat/types";
import { loadChatDocuments } from "@/lib/data/chat-documents";
import { maskPersonalInfo } from "@/lib/masking";
import { getSupabase } from "@/lib/supabase";

export const maxDuration = 60;

const reply = (status: number, body: ChatAnswer | { error: string }) => Response.json(body, { status });

export async function POST(request: Request) {
  // 1. 질문 검사 (질문에 섞인 개인정보도 AI에 보내기 전에 가린다)
  const body = (await request.json().catch(() => null)) as { question?: unknown; history?: unknown } | null;
  const question = typeof body?.question === "string" ? maskPersonalInfo(body.question.trim()) : "";
  if (!question) return reply(400, { error: "질문을 입력해주세요." });
  if (question.length > MAX_QUESTION_CHARS) return reply(400, { error: `질문은 ${MAX_QUESTION_CHARS}자 이하로 입력해주세요.` });
  const history = readHistory(body?.history);

  // 개인정보를 묻는 질문은 AI를 부르지 않고 정해진 안내를 한다 (PRD 7-②)
  if (asksPersonalInfo(question)) return reply(200, { answer: NO_PERSONAL_INFO, sources: [] });

  // 2. 어느 공사인지 찾기
  const { data: projects, error } = await getSupabase().from("projects").select("id, name").order("created_at");
  if (error) {
    console.error(`[DB 오류] 공사 목록 읽기: ${error.code}`);
    return reply(500, { error: AI_RETRY_MESSAGE });
  }
  if (projects.length === 0) {
    return reply(200, { answer: "등록된 공사가 없습니다. 공사 목록에서 먼저 공사를 등록해주세요.", sources: [] });
  }
  const earlierQuestions = history.filter((t) => t.role === "user").map((t) => t.text);
  const match = matchProject(question, earlierQuestions, projects);
  if (match.kind === "ask") {
    return reply(200, {
      answer: "어느 공사에 대해 궁금하신가요? 아래에서 골라주세요.",
      sources: [],
      askProject: match.candidates.map((p) => p.name),
    });
  }

  // 3. 그 공사의 확인된 문서 모으기 → 질문에 달(예: 8월)이 있으면 그 달 문서만
  //    (문서가 없으면 AI를 부르지 않는다)
  let documents;
  try {
    documents = filterByQuestionMonth(question, await loadChatDocuments(match.project.id));
  } catch {
    return reply(500, { error: AI_RETRY_MESSAGE });
  }
  if (documents.length === 0) return reply(200, { answer: NOT_FOUND, sources: [] });

  // 4~5. AI 답변 → 코드 검사
  try {
    const answer = await answerQuestion({ projectName: match.project.name, question, history, documents });
    return reply(200, answer);
  } catch (error) {
    if (!(error instanceof AiError)) console.error(`[챗봇] ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    return reply(503, { error: AI_RETRY_MESSAGE });
  }
}

/** 화면이 보낸 최근 대화를 검사한다 (모양이 틀린 것은 버리고, 최근 3번까지만) */
function readHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is ChatTurn =>
        !!t && typeof t === "object" && (t.role === "user" || t.role === "assistant") && typeof t.text === "string",
    )
    .slice(-HISTORY_TURNS * 2)
    .map((t) => ({ role: t.role, text: maskPersonalInfo(t.text.slice(0, 2000)) }));
}
