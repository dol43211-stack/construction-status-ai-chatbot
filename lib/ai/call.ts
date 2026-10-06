// AI 호출 안전망 (서버 전용) — PLAN 9번
// 모든 AI 호출(문서 정보 읽기, 보고서 초안, 챗봇)은 이 함수를 거친다.
// - 2분이 지나면 기다리기를 멈추고 AI 요청도 취소한다.
// - 어떤 오류든 AiError("잠시 후 다시 시도해주세요.")로 바꿔 던진다.
// - 서버 기록에는 오류 종류와 상태 번호만 남긴다. OpenAI 오류 문구에는 키 일부가 섞일 수 있어 남기지 않는다.
import "server-only";

import OpenAI from "openai";
import { AI_TIMEOUT_MS, AiError, type AiErrorKind } from "./errors.ts";

type CallOptions = {
  /** 서버 기록에 남길 작업 이름 (예: "보고서 초안") */
  label: string;
  /** 최대 대기 시간(밀리초). 기본 2분 */
  timeoutMs?: number;
};

/**
 * AI 호출을 시간 한도 안에서 실행한다.
 * @param run AI를 부르는 함수. 받은 signal을 OpenAI 요청에 꼭 넘겨야 시간 초과 때 요청이 취소된다.
 *
 * 사용 예:
 *   const res = await callAi((signal) => getOpenAI().responses.create({ ... }, { signal }), { label: "챗봇" });
 */
export async function callAi<T>(run: (signal: AbortSignal) => Promise<T>, options: CallOptions): Promise<T> {
  const { label, timeoutMs = AI_TIMEOUT_MS } = options;
  const controller = new AbortController();
  let timedOut = false;

  // 시간이 다 되면 AI 요청을 취소하고, 기다리던 쪽에는 바로 "시간 초과"를 알린다.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new AiError("timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout]);
  } catch (error) {
    const kind: AiErrorKind = timedOut || error instanceof OpenAI.APIConnectionTimeoutError ? "timeout" : "failed";
    console.error(`[AI 오류] ${label}: ${kind} (${describe(error)})`);
    throw error instanceof AiError ? error : new AiError(kind);
  } finally {
    clearTimeout(timer);
  }
}

/** 서버 기록용 짧은 설명: 오류 이름과 상태 번호만 (오류 문구는 남기지 않음) */
function describe(error: unknown): string {
  if (error instanceof OpenAI.APIError) return `${error.name} ${error.status ?? "-"}`;
  if (error instanceof Error) return error.name;
  return "알 수 없는 오류";
}
