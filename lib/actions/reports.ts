"use server";
// 보고서 관련 서버 함수 (DESIGN.md 6.2, 설계 검토 m-11) — PLAN 19·21번
import { revalidatePath } from "next/cache";
import { findReportDocuments, type ReportDocument } from "@/lib/data/report-documents";
import { applyEdits, type ItemEdit } from "@/lib/reports/edit";
import type { ReportItem } from "@/lib/reports/items";
import { reportPeriod, type Period, type PeriodType } from "@/lib/reports/period";
import { getSupabase } from "@/lib/supabase";

export type PreviewResult =
  | { ok: true; period: Period; documents: ReportDocument[]; pendingCount: number }
  | { ok: false; message: string };

/** 고른 공사·기간에 해당하는 문서 미리보기 (새 보고서 3단계) */
export async function previewReportDocuments(
  projectId: string,
  type: PeriodType,
  value: string,
): Promise<PreviewResult> {
  if (!projectId) return { ok: false, message: "공사를 골라주세요." };
  const period = reportPeriod(type, value);
  if (!period) return { ok: false, message: type === "weekly" ? "날짜를 골라주세요." : "연·월을 골라주세요." };

  try {
    const { documents, pendingCount } = await findReportDocuments(projectId, period);
    return { ok: true, period, documents, pendingCount };
  } catch {
    return { ok: false, message: "문서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." };
  }
}

export type SaveResult = { ok: true; savedAt: string; items: ReportItem[] } | { ok: false; message: string };

/** 초안 임시 저장 (DESIGN.md 6.2 saveReportDraft) — PLAN 21번 */
export async function saveReportDraft(reportId: string, edits: ItemEdit[]): Promise<SaveResult> {
  const supabase = getSupabase();
  const { data: report, error } = await supabase
    .from("reports")
    .select("items, status")
    .eq("id", reportId)
    .maybeSingle();
  if (error) return dbFail("보고서 읽기", error.code);
  if (!report) return { ok: false, message: "보고서를 찾을 수 없습니다. 화면을 새로고침해주세요." };
  if (report.status !== "draft") return { ok: false, message: "확정된 보고서는 고칠 수 없습니다." };

  const result = applyEdits(report.items as ReportItem[], edits);
  if (!result.ok) return result;

  const { data: saved, error: saveError } = await supabase
    .from("reports")
    .update({ items: result.items })
    .eq("id", reportId)
    .eq("status", "draft") // 저장하는 사이에 확정됐다면 덮어쓰지 않는다
    .select("updated_at")
    .maybeSingle();
  if (saveError) return dbFail("초안 저장", saveError.code);
  if (!saved) return { ok: false, message: "확정된 보고서는 고칠 수 없습니다." };

  revalidatePath(`/reports/${reportId}/edit`);
  return { ok: true, savedAt: saved.updated_at, items: result.items };
}

export type ConfirmResult = { ok: true } | { ok: false; message: string };

/**
 * 보고서 확정 (DESIGN.md 6.2 confirmReport) — PLAN 22번
 * 화면에 남아 있던 수정 내용까지 함께 저장한 뒤 "확정"으로 바꾸고 확정 시각을 기록한다.
 * 확정한 보고서는 고칠 수 없다. (같은 공사·기간의 확정본은 데이터베이스 규칙으로도 하나만)
 */
export async function confirmReport(reportId: string, edits: ItemEdit[]): Promise<ConfirmResult> {
  const supabase = getSupabase();
  const { data: report, error } = await supabase
    .from("reports")
    .select("items, status")
    .eq("id", reportId)
    .maybeSingle();
  if (error) return dbFail("보고서 읽기", error.code);
  if (!report) return { ok: false, message: "보고서를 찾을 수 없습니다. 화면을 새로고침해주세요." };
  if (report.status !== "draft") return { ok: false, message: "이미 확정된 보고서입니다." };

  const result = applyEdits(report.items as ReportItem[], edits);
  if (!result.ok) return result;

  const { data: done, error: confirmError } = await supabase
    .from("reports")
    .update({ items: result.items, status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", reportId)
    .eq("status", "draft") // 그사이 다른 사람이 확정했다면 다시 확정하지 않는다
    .select("id")
    .maybeSingle();
  if (confirmError) {
    if (confirmError.code === "23505") {
      return { ok: false, message: "이 공사·기간의 보고서가 이미 확정되어 있습니다. 보고서 목록에서 확인해주세요." };
    }
    return dbFail("보고서 확정", confirmError.code);
  }
  if (!done) return { ok: false, message: "이미 확정된 보고서입니다." };

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/reports/${reportId}/edit`);
  revalidatePath("/"); // 홈의 "최근 확정 보고서"
  return { ok: true };
}

export type DocumentTextResult = { ok: true; fileName: string; text: string } | { ok: false; message: string };

/** 근거 문서 글자 보기 (설계 검토 m-11 getDocumentText) — 개인정보를 가린 본문만 돌려준다 */
export async function getDocumentText(documentId: string): Promise<DocumentTextResult> {
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return { ok: false, message: "문서를 찾을 수 없습니다." };
  const { data, error } = await getSupabase()
    .from("documents")
    .select("file_name, text")
    .eq("id", documentId)
    .maybeSingle();
  if (error) return dbFail("문서 읽기", error.code);
  if (!data) return { ok: false, message: "문서를 찾을 수 없습니다. 지워졌을 수 있습니다." };
  return { ok: true, fileName: data.file_name, text: data.text };
}

function dbFail(step: string, code: string): { ok: false; message: string } {
  console.error(`[DB 오류] ${step}: ${code}`);
  return { ok: false, message: "처리하지 못했습니다. 잠시 후 다시 시도해주세요." };
}
