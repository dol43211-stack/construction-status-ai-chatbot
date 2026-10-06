// 공사 목록 읽기 (서버 전용) — DESIGN.md 3.3 ② 공사 목록
import "server-only";

import { getSupabase } from "@/lib/supabase";

export type ProjectRow = {
  id: string;
  name: string;
  createdAt: string;
  /** 이 공사에 연결된 문서 수 */
  documentCount: number;
};

/** 등록된 공사를 등록 순서대로 돌려준다 (연결된 문서 수 포함) */
export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("id, name, created_at, documents(count)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`[DB 오류] 공사 목록 읽기: ${error.code}`);
    throw new Error("공사 목록을 불러오지 못했습니다.");
  }

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    documentCount: (p.documents as { count: number }[])[0]?.count ?? 0,
  }));
}
