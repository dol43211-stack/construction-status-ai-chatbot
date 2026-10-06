// AI 호출 안전망 시험 (실행: npm test)
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import OpenAI from "openai";
import { callAi } from "./call.ts";
import { AI_RETRY_MESSAGE, AiError } from "./errors.ts";

/** 서버 기록(console.error)을 잠시 가로채서 내용을 확인한다 */
function captureLog() {
  const logged: string[] = [];
  const spy = mock.method(console, "error", (msg: string) => logged.push(msg));
  return { logged, restore: () => spy.mock.restore() };
}

/** AiError인지, 종류가 맞는지 확인 */
const isAiError = (kind: "timeout" | "failed") => (e: unknown) =>
  e instanceof AiError && e.kind === kind && e.message === AI_RETRY_MESSAGE;

describe("정상 응답", () => {
  it("AI 결과를 그대로 돌려준다", async () => {
    const result = await callAi(async () => "답변", { label: "시험" });
    assert.equal(result, "답변");
  });
});

describe("시간 초과", () => {
  it("한도를 넘기면 AiError(timeout)를 던지고 AI 요청을 취소한다", async () => {
    const log = captureLog();
    let received: AbortSignal | undefined;
    await assert.rejects(
      callAi(
        (signal) => {
          received = signal;
          return new Promise(() => {}); // 영원히 끝나지 않는 AI 흉내
        },
        { label: "시험", timeoutMs: 50 },
      ),
      isAiError("timeout"),
    );
    log.restore();
    assert.equal(received?.aborted, true, "AI 요청이 취소되어야 한다");
    assert.match(log.logged[0], /\[AI 오류\] 시험: timeout/);
  });

  it("OpenAI 자체의 연결 시간 초과도 timeout으로 분류한다", async () => {
    const log = captureLog();
    await assert.rejects(
      callAi(async () => {
        throw new OpenAI.APIConnectionTimeoutError();
      }, { label: "시험" }),
      isAiError("timeout"),
    );
    log.restore();
  });
});

describe("AI 서비스 오류", () => {
  it("사용량 초과(429)는 AiError(failed)로 바꾼다", async () => {
    const log = captureLog();
    await assert.rejects(
      callAi(async () => {
        throw new OpenAI.RateLimitError(429, undefined, "Rate limit reached", new Headers());
      }, { label: "보고서 초안" }),
      isAiError("failed"),
    );
    log.restore();
    assert.match(log.logged[0], /보고서 초안: failed \(.*429\)/);
  });

  it("키 오류(401)의 원래 문구는 서버 기록에 남기지 않는다 (키 일부가 섞일 수 있음)", async () => {
    const log = captureLog();
    await assert.rejects(
      callAi(async () => {
        throw new OpenAI.AuthenticationError(401, undefined, "Incorrect API key provided: sk-abc...wxyz", new Headers());
      }, { label: "시험" }),
      isAiError("failed"),
    );
    log.restore();
    assert.ok(!log.logged.join("").includes("sk-abc"), "키 조각이 기록에 남으면 안 된다");
  });

  it("그 밖의 예상 못 한 오류도 같은 안내로 바꾼다", async () => {
    const log = captureLog();
    await assert.rejects(
      callAi(async () => {
        throw new TypeError("이상한 오류");
      }, { label: "시험" }),
      isAiError("failed"),
    );
    log.restore();
  });
});
