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

  const rel = data.projects as unknown;
  const project = (Array.isArray(rel) ? rel[0] : rel) as { name: string } | null;
  return {
    id: data.id,
    projectId: data.project_id,
    projectName: project?.name ?? "",
    periodType: data.period_type,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    items: data.items as ReportItem[],
    status: data.status,
    confirmedAt: data.confirmed_at,
    updatedAt: data.updated_at,
  };
}
