// 화면 쪽 기다림 한도 (DESIGN.md 6.1) — PLAN 9번
// 화면에서 서버의 AI 기능을 부를 때 쓴다. 2분이 지나면 기다리기를 멈추고 안내 문구를 돌려준다.
// 결과는 항상 { ok: true, data } 또는 { ok: false, message } 모양이라, 화면은 message를 그대로 보여주면 된다.
import { AI_RETRY_MESSAGE, AI_TIMEOUT_MS } from "./ai/errors.ts";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function fetchWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      // 서버가 { error: "안내 문구" }를 보내면 그 문구를, 아니면 기본 안내를 쓴다.
      const message =
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : AI_RETRY_MESSAGE;
      return { ok: false, message };
    }
    return { ok: true, data: body as T };
  } catch {
    // 시간 초과, 인터넷 끊김 등
    return { ok: false, message: AI_RETRY_MESSAGE };
  }
}
