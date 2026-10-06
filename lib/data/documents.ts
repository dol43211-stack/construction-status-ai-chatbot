// 문서 정보 읽기 (서버 전용)
import "server-only";

import type { DocKind } from "@/lib/documents/document-info";
import type { FileType } from "@/lib/documents/upload-rules";
import { getSupabase } from "@/lib/supabase";

export type DocumentRow = {
  id: string;
  fileName: string;
  fileType: FileType;
  projectId: string | null;
  projectName: string | null;
  docKind: DocKind | null;
  writtenDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  confirmed: boolean;
  createdAt: string;
};

export type DocumentFilter = {
  /** 이 공사의 문서만 */
  projectId?: string;
  /** 확인 필요 문서만 */
  pendingOnly?: boolean;
};

/** 문서 목록 (최근에 올린 것부터) — DESIGN.md 3.3 ③ 문서 표 */
export async function listDocuments(filter: DocumentFilter = {}): Promise<DocumentRow[]> {
  let query = getSupabase()
    .from("documents")
    .select(
      "id, file_name, file_type, project_id, doc_kind, written_date, period_start, period_end, confirmed, created_at, projects(name)",
    )
    .order("created_at", { ascending: false });
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.pendingOnly) query = query.eq("confirmed", false);

  const { data, error } = await query;
  if (error) {
    console.error(`[DB 오류] 문서 목록 읽기: ${error.code}`);
    throw new Error("문서 목록을 불러오지 못했습니다.");
  }

  return data.map((d) => ({
    id: d.id,
    fileName: d.file_name,
    fileType: d.file_type,
    projectId: d.project_id,
    projectName: relatedName(d.projects),
    docKind: d.doc_kind,
    writtenDate: d.written_date,
    periodStart: d.period_start,
    periodEnd: d.period_end,
    confirmed: d.confirmed,
    createdAt: d.created_at,
  }));
}

/**
 * 연결된 공사 이름. Supabase는 연결된 줄을 하나(객체)로 줄 때와 목록(배열)으로 줄 때가 있어 둘 다 받는다.
 * 문서 하나에는 공사가 하나뿐이므로 배열이면 첫 번째를 쓴다.
 */
function relatedName(rel: unknown): string | null {
  const one = Array.isArray(rel) ? rel[0] : rel;
  return one && typeof one === "object" && "name" in one && typeof one.name === "string" ? one.name : null;
}
