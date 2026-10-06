// Supabase 연결 (서버 전용)
// 설계 근거: DESIGN.md 5.4 접근 보안, 8장 보안 점검표
// - 서버용 키(SUPABASE_SERVICE_ROLE_KEY)는 표의 행 단위 보안(RLS)을 통과할 수 있는 강력한 키다.
// - 그래서 이 파일은 서버 코드에서만 불러올 수 있다. 화면 코드("use client")에서 불러오면 빌드가 멈춘다.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** 문서 원본을 보관하는 비공개 보관함 이름 (DESIGN.md 5.3) */
export const DOCUMENTS_BUCKET = "documents";

let client: SupabaseClient | null = null;

/** .env에서 값을 읽는다. 값이 없으면 이름만 알려 주고, 값 자체는 절대 오류 문구에 넣지 않는다. */
function readEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}이(가) 없습니다. .env 파일을 확인해주세요.`);
  }
  return value;
}

/**
 * 서버에서 쓰는 Supabase 연결을 돌려준다.
 * 처음 부를 때 한 번만 만들고, 이후에는 같은 연결을 다시 쓴다.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(readEnv("SUPABASE_URL"), readEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      // 로그인 기능이 없으므로 로그인 상태를 저장하거나 갱신하지 않는다.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
