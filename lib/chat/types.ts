// 챗봇 화면과 서버(/api/chat)가 주고받는 모양 (DESIGN.md 4.4 흐름 ③, 6.1) — PLAN 26~27번
// 비밀 값을 다루지 않으므로 서버·화면 어디서든 불러올 수 있다.

/** 대화 한 번 (질문 또는 답변) */
export type ChatTurn = { role: "user" | "assistant"; text: string };

/** 화면 → 서버 */
export type ChatRequest = {
  question: string;
  /** 최근 대화 (DESIGN.md 4.4: 최근 3번 주고받은 것까지) */
  history: ChatTurn[];
};

/** 답변의 근거 문서 */
export type ChatSource = { fileName: string; writtenDate: string | null };

/** 서버 → 화면 */
export type ChatAnswer = {
  answer: string;
  sources: ChatSource[];
  /** 어느 공사인지 알 수 없어 되물을 때, 고를 수 있는 공사 이름들 (PRD M2 규칙 4) */
  askProject?: string[];
};

/** 질문 최대 글자 수 */
export const MAX_QUESTION_CHARS = 500;

/** 최근 대화를 몇 번까지 보낼지 (질문+답변 = 1번) */
export const HISTORY_TURNS = 3;
