// 보고서 읽기 (서버 전용)
import "server-only";

import type { ReportItem } from "@/lib/reports/items";
import type { PeriodType } from "@/lib/reports/period";
import { getSupabase } from "@/lib/supabase";

export type Report = {
  id: string;
  projectId: string;
  projectName: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  items: ReportItem[];
  status: "draft" | "confirmed";
  confirmedAt: string | null;
  updatedAt: string;
};

export type ReportSummary = {
  id: string;
  projectName: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "confirmed";
  confirmedAt: string | null;
  updatedAt: string;
  /** "확인 필요" 표시가 남은 항목 수 */
  checkCount: number;
};

export type ReportFilter = {
  status: "draft" | "confirmed";
  projectId?: string;
  periodType?: PeriodType;
  /** "2026-09" → 보고 기간 시작일이 이 달에 있는 보고서 */
  yearMonth?: string;
  limit?: number;
};

/** 보고서 목록 — 확정본은 최근 확정 순, 초안은 최근 수정 순 (DESIGN.md 3.3 ⑥) — PLAN 23번 */
export async function listReports(filter: ReportFilter): Promise<ReportSummary[]> {
  let query = getSupabase()
    .from("reports")
    .select("id, period_type, period_start, period_end, items, status, confirmed_at, updated_at, projects(name)")
    .eq("status", filter.status)
    .order(filter.status === "confirmed" ? "confirmed_at" : "updated_at", { ascending: false })
    .order("period_start", { ascending: false });
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.periodType) query = query.eq("period_type", filter.periodType);
  if (filter.yearMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(filter.yearMonth)) {
    const [y, m] = filter.yearMonth.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    query = query.gte("period_start", `${filter.yearMonth}-01`).lte("period_start", `${filter.yearMonth}-${last}`);
  }
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) {
    console.error(`[DB 오류] 보고서 목록 읽기: ${error.code}`);
    throw new Error("보고서 목록을 불러오지 못했습니다.");
  }
  return data.map((r) => ({
    id: r.id,
    projectName: projectNameOf(r.projects),
    periodType: r.period_type,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    status: r.status,
    confirmedAt: r.confirmed_at,
    updatedAt: r.updated_at,
    checkCount: (r.items as ReportItem[]).filter((i) => i.needsCheck).length,
  }));
}

/** 작성 중인 초안 수 (탭 표시용) */
export async function countDrafts(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  if (error) {
    console.error(`[DB 오류] 초안 수 읽기: ${error.code}`);
    return 0;
  }
  return count ?? 0;
}

/** Supabase는 연결된 공사를 객체 또는 배열로 줄 수 있어 둘 다 받는다 */
function projectNameOf(rel: unknown): string {
  const one = Array.isArray(rel) ? rel[0] : rel;
  return one && typeof one === "object" && "name" in one && typeof one.name === "string" ? one.name : "";
}

/** 보고서 하나. 없으면 null */
export async function getReport(id: string): Promise<Report | null> {
  // id 모양이 틀리면 DB가 오류를 내므로 먼저 거른다
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data, error } = await getSupabase()
    .from("reports")
    .select("id, project_id, period_type, period_start, period_end, items, status, confirmed_at, updated_at, projects(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[DB 오류] 보고서 읽기: ${error.code}`);
    throw new Error("보고서를 불러오지 못했습니다.");
  }
  if (!data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    projectName: projectNameOf(data.projects),
    periodType: data.period_type,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    items: data.items as ReportItem[],
    status: data.status,
    confirmedAt: data.confirmed_at,
    updatedAt: data.updated_at,
  };
}
