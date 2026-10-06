"use client";
// ⑧ 챗봇 화면 (DESIGN.md 3.3) — PLAN 26번
// - 내 질문은 오른쪽, AI 답변은 왼쪽 말풍선. 답변 아래에 📎 근거 문서·작성일
// - 처음에는 예시 질문 버튼 3개
// - 아래 고정 입력칸 (Enter 보내기, Shift+Enter 줄바꿈)
// - 어느 공사인지 되물으면 공사 고르기 버튼 (PRD M2 규칙 4)
// - 대화는 이 화면에 있는 동안만 남는다 (저장하지 않음)
import { useEffect, useRef, useState } from "react";
import { HISTORY_TURNS, MAX_QUESTION_CHARS, type ChatAnswer, type ChatTurn } from "@/lib/chat/types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

/** 챗봇 화면의 기다림 한도: 1분 (목표는 30초 이내 답변, PRD 3장) */
const CHAT_TIMEOUT_MS = 60_000;

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: ChatAnswer; question: string }
  | { id: number; role: "error"; text: string; question: string };

export function ChatRoom({ examples }: { examples: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  // 새 말풍선이 생기면 맨 아래로
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  async function ask(raw: string) {
    const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || waiting) return;

    // 최근 대화 (질문·답변 쌍으로 최대 3번)
    const history: ChatTurn[] = messages
      .flatMap((m): ChatTurn[] =>
        m.role === "user" ? [{ role: "user", text: m.text }] : m.role === "assistant" ? [{ role: "assistant", text: m.answer.answer }] : [],
      )
      .slice(-HISTORY_TURNS * 2);

    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: question }]);
    setInput("");
    setWaiting(true);
    const result = await fetchWithTimeout<ChatAnswer>(
      "/api/chat",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, history }) },
      CHAT_TIMEOUT_MS,
    );
    setMessages((prev) => [
      ...prev,
      result.ok
        ? { id: nextId.current++, role: "assistant", answer: result.data, question }
        : { id: nextId.current++, role: "error", text: result.message, question },
    ]);
    setWaiting(false);
  }

  return (
    <div className="pb-36 md:pb-24">
      {messages.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-800">👋 공사 현황을 물어보세요.</p>
          <p className="mt-1 text-sm text-slate-600">
            직원이 확인한 문서만 근거로 답하고, 답변마다 근거 문서를 알려드려요.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {examples.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-800 hover:bg-blue-100"
              >
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-[15px] text-white">
                {m.text}
              </p>
            ) : m.role === "assistant" ? (
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
                <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-800">{m.answer.answer}</p>
                {m.answer.sources.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    {m.answer.sources.map((s) => (
                      <li key={`${s.fileName}-${s.writtenDate}`} className="break-all">
                        📎 {s.fileName}
                        {s.writtenDate ? ` (${s.writtenDate})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {m.answer.askProject && m.answer.askProject.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.answer.askProject.map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={waiting}
                        onClick={() => ask(`${name} ${m.question}`)}
                        className="rounded-full border border-blue-300 px-3 py-1 text-sm text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                      >
                        🏗️ {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                ⚠️ {m.text}
                <button
                  type="button"
                  disabled={waiting}
                  onClick={() => ask(m.question)}
                  className="ml-2 font-semibold underline disabled:opacity-50"
                >
                  다시 묻기
                </button>
              </div>
            )}
          </li>
        ))}
        {waiting && (
          <li className="flex justify-start">
            <p className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">
              🔎 문서에서 답을 찾는 중…
            </p>
          </li>
        )}
      </ol>
      <div ref={bottom} />

      {/* 아래 고정 입력칸 (휴대폰에서는 아래 메뉴 위에) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-56"
      >
        <div className="mx-auto flex max-w-5xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter는 보내기, Shift+Enter는 줄바꿈 (한글 입력 중 조합 Enter는 무시)
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(input);
              }
            }}
            rows={Math.min(4, Math.max(1, input.split("\n").length))}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="예: 한빛청사 9월 공정률은?"
            aria-label="질문 입력"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={waiting || !input.trim()}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  );
}
