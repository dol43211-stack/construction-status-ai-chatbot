// 문서 정보 읽기 (서버 전용)
import "server-only";

import { getSupabase } from "@/lib/supabase";

/** 지금까지 올라온 문서 수 */
export async function countDocuments(): Promise<number> {
  const { count, error } = await getSupabase().from("documents").select("id", { count: "exact", head: true });
  if (error) {
    console.error(`[DB 오류] 문서 수 읽기: ${error.code}`);
    throw new Error("문서 정보를 불러오지 못했습니다.");
  }
  return count ?? 0;
}
