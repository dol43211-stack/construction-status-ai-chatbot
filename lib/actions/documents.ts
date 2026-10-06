"use server";
// 문서 정보 수정·확인 (DESIGN.md 6.2 Server Action `updateDocumentInfo`) — PLAN 18번
// 직원이 AI가 읽은 정보를 고치고 [확인]을 누르면 저장하고 "확인됨"으로 바꾼다.
// 확인된 문서만 보고서·챗봇의 근거로 쓴다. (설계 검토 Q1 권장안)
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/projects";
import { checkConfirmable, type DocumentInfoInput } from "@/lib/documents/document-info";
import { getSupabase } from "@/lib/supabase";

const fail = (message: string): ActionState => ({ ok: false, message });

export async function confirmDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("확인할 문서를 찾을 수 없습니다.");

  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const input: DocumentInfoInput = {
    projectId: read("projectId"),
    docKind: read("docKind"),
    writtenDate: read("writtenDate"),
    periodStart: read("periodStart"),
    periodEnd: read("periodEnd"),
  };

  const supabase = getSupabase();
  const { data: projects, error: projectError } = await supabase.from("projects").select("id");
  if (projectError) {
    console.error(`[DB 오류] 공사 목록 읽기: ${projectError.code}`);
    return fail("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const problem = checkConfirmable(
    input,
    projects.map((p) => p.id),
  );
  if (problem) return fail(problem);

  const { data, error } = await supabase
    .from("documents")
    .update({
      project_id: input.projectId,
      doc_kind: input.docKind,
      written_date: input.writtenDate,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      confirmed: true,
    })
    .eq("id", id)
    .select("id");
  if (error) {
    console.error(`[DB 오류] 문서 확인: ${error.code}`);
    return fail("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data?.length) return fail("문서를 찾을 수 없습니다. 화면을 새로고침해주세요.");

  revalidatePath("/documents");
  revalidatePath("/projects"); // 공사별 연결된 문서 수가 바뀔 수 있다
  return { ok: true, message: "확인했습니다." };
}
