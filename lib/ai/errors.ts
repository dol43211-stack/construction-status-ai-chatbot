// AI 지연·오류 공통 약속 (DESIGN.md 4.3, 6.1, 6.3)
// - 서버와 화면이 같은 기준(시간 한도, 안내 문구)을 쓰도록 한곳에 모아 둔다.
// - 비밀 값을 다루지 않으므로 서버·화면 어디서든 불러올 수 있다.

/** AI 작업 최대 대기 시간: 2분 (PRD 예외 상황 5번) */
export const AI_TIMEOUT_MS = 120_000;

/** AI가 늦거나 실패했을 때 사용자에게 보여줄 문구 (DESIGN.md 6.3) */
export const AI_RETRY_MESSAGE = "잠시 후 다시 시도해주세요.";

/** timeout: 시간 초과 / failed: AI 서비스 오류(사용량 초과, 키 오류, 서버 오류 등) */
export type AiErrorKind = "timeout" | "failed";

/** AI 호출이 실패했음을 알리는 오류. message는 항상 사용자용 안내 문구다. */
export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind) {
    super(AI_RETRY_MESSAGE);
    this.name = "AiError";
    this.kind = kind;
  }
}
