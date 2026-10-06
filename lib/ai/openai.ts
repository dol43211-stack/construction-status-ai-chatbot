// OpenAI 연결 (서버 전용)
// 설계 근거: DESIGN.md 2.2 기술 선택, 8장 보안 점검표
// - OPENAI_API_KEY는 비밀 키이므로 이 파일은 서버 코드에서만 불러올 수 있다.
// - 모델 이름은 코드에 박지 않고 .env의 OPENAI_MODEL로 정한다. (모델을 바꿔도 코드 수정 불필요)
import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

/** .env에서 값을 읽는다. 값이 없으면 이름만 알려 주고, 값 자체는 절대 오류 문구에 넣지 않는다. */
function readEnv(name: "OPENAI_API_KEY" | "OPENAI_MODEL"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}이(가) 없습니다. .env 파일을 확인해주세요.`);
  }
  return value;
}

/**
 * 서버에서 쓰는 OpenAI 연결을 돌려준다.
 * 처음 부를 때 한 번만 만들고, 이후에는 같은 연결을 다시 쓴다.
 */
export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: readEnv("OPENAI_API_KEY") });
  }
  return client;
}

/** 사용할 AI 모델 이름 (.env의 OPENAI_MODEL) */
export function getModel(): string {
  return readEnv("OPENAI_MODEL");
}
