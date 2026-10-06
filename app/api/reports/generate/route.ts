// POST /api/reports/generate — 보고서 초안 만들기 (DESIGN.md 4.3 흐름 ① 1~5단계, 6.1) — PLAN 20번
// 처리 순서: 조건 검사 → 같은 공사·기간 보고서 확인 → 문서 고르기 → 본문 읽기 → AI 초안 → 코드 검사 → 초안 저장
// - 같은 공사·같은 기간의 보고서가 이미 "확정"이면 막고, "초안"이면 새 초안으로 덮어쓴다. (설계 검토 m-9 권장안)
// - AI가 2분을 넘기거나 실패하면 저장하지 않고 "잠시 후 다시 시도해주세요."를 돌려준다. (화면의 고른 조건은 그대로 남는다)
import { generateDraft } from "@/lib/ai/generate-draft";
import { AI_RETRY_MESSAGE, AiError } from "@/lib/ai/errors";
import { findReportDocuments } from "@/lib/data/report-documents";
import { reportPeriod, type PeriodType } from "@/lib/reports/period";
import { getSupabase } from "@/lib/supabase";

/** AI 초안 작성 최대 2분 (DESIGN.md 6.1) */
export const maxDuration = 120;

const FAILED = "초안을 만들지 못했습니다. 잠시 후 다시 시도해주세요.";
const reply = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request) {
  // 1. 조건 검사
  const body = (await request.json().catch(() => null)) as {
    projectId?: unknown;
    periodType?: unknown;
    value?: unknown;
  } | null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const periodType: PeriodType | null =
    body?.periodType === "weekly" || body?.periodType === "monthly" ? body.periodType : null;
  const period = periodType && typeof body?.value === "string" ? reportPeriod(periodType, body.value) : null;
  if (!projectId || !periodType || !period) return reply(400, { error: "공사와 기간을 다시 골라주세요." });

  const supabase = getSupabase();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return dbFail("공사 읽기", projectError.code);
  if (!project) return reply(404, { error: "공사를 찾을 수 없습니다. 화면을 새로고침해주세요." });

  // 2. 같은 공사·기간 보고서가 있는지 (확정본이 있으면 막기, 초안이면 덮어쓰기)
  const { data: existing, error: existingError } = await supabase
    .from("reports")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("period_type", periodType)
    .eq("period_start", period.start);
  if (existingError) return dbFail("기존 보고서 확인", existingError.code);
  if (existing.some((r) => r.status === "confirmed")) {
    return reply(409, { error: "이 공사·기간의 보고서가 이미 확정되어 있습니다. 보고서 목록에서 확인해주세요." });
  }
  const draftId = existing.find((r) => r.status === "draft")?.id;

  // 3. 문서 고르기 (미리보기와 같은 규칙, 직원이 확인한 문서만)
  let picked;
  try {
    picked = await findReportDocuments(projectId, period);
  } catch {
    return reply(500, { error: FAILED });
  }
  if (picked.documents.length === 0) return reply(422, { error: "선택한 기간에 해당하는 문서가 없습니다." });

  // 4. 본문 읽기 (개인정보를 가린 글자)
  const { data: texts, error: textError } = await supabase
    .from("documents")
    .select("id, text")
    .in(
      "id",
      picked.documents.map((d) => d.id),
    );
  if (textError) return dbFail("본문 읽기", textError.code);
  const textById = new Map(texts.map((t) => [t.id, t.text]));

  // 5. AI 초안 → 코드 검사·보정
  let items;
  try {
    items = await generateDraft({
      projectName: project.name,
      periodType,
      period,
      documents: picked.documents.map((d) => ({
        documentId: d.id,
        fileName: d.fileName,
        writtenDate: d.writtenDate,
        docKind: d.docKind,
        period: d.period,
        text: textById.get(d.id) ?? "",
      })),
    });
  } catch (error) {
    if (!(error instanceof AiError)) console.error(`[보고서 초안] ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    return reply(503, { error: AI_RETRY_MESSAGE });
  }

  // 6. 초안 저장 (있으면 덮어쓰기)
  const row = {
    project_id: projectId,
    period_type: periodType,
    period_start: period.start,
    period_end: period.end,
    items,
    source_document_ids: picked.documents.map((d) => d.id),
    status: "draft",
  };
  const saved = draftId
    ? await supabase.from("reports").update(row).eq("id", draftId).select("id").single()
    : await supabase.from("reports").insert(row).select("id").single();
  if (saved.error) return dbFail("초안 저장", saved.error.code);

  return reply(201, { reportId: saved.data.id, overwritten: !!draftId });
}

function dbFail(step: string, code: string) {
  console.error(`[DB 오류] ${step}: ${code}`);
  return reply(500, { error: FAILED });
}
