"use server";
// 공사 추가·이름 수정·삭제 (DESIGN.md 6.2 Server Action)
// 화면의 버튼이 이 함수들을 바로 부른다. 결과는 { ok, message } 모양으로 돌려주고 화면이 message를 보여준다.
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export type ActionState = { ok: boolean; message: string } | null;

const NAME_MAX = 100;

/** Supabase(PostgreSQL) 오류 번호 */
const UNIQUE_VIOLATION = "23505"; // 같은 값이 이미 있음
const FOREIGN_KEY_VIOLATION = "23503"; // 다른 표가 이 줄을 쓰고 있음

/** 입력한 공사명을 다듬고 검사한다. 문제가 있으면 안내 문구를 돌려준다. */
function readName(formData: FormData): { name: string } | { error: string } {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: "공사명을 입력해주세요." };
  if (name.length > NAME_MAX) return { error: `공사명은 ${NAME_MAX}자 이하로 입력해주세요.` };
  return { name };
}

const fail = (message: string): ActionState => ({ ok: false, message });

/** 공사 추가 */
export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const input = readName(formData);
  if ("error" in input) return fail(input.error);

  const { error } = await getSupabase().from("projects").insert({ name: input.name });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(`"${input.name}"은(는) 이미 등록된 공사명입니다.`);
    console.error(`[DB 오류] 공사 추가: ${error.code}`);
    return fail("공사를 추가하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/projects");
  return { ok: true, message: `"${input.name}"을(를) 추가했습니다.` };
}

/** 공사 이름 수정 */
export async function renameProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const input = readName(formData);
  if (!id) return fail("수정할 공사를 찾을 수 없습니다.");
  if ("error" in input) return fail(input.error);

  const { data, error } = await getSupabase()
    .from("projects")
    .update({ name: input.name })
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(`"${input.name}"은(는) 이미 등록된 공사명입니다.`);
    console.error(`[DB 오류] 공사 이름 수정: ${error.code}`);
    return fail("이름을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data?.length) return fail("수정할 공사를 찾을 수 없습니다. 화면을 새로고침해주세요.");

  revalidatePath("/projects");
  return { ok: true, message: `이름을 "${input.name}"(으)로 바꿨습니다.` };
}

/** 공사 삭제 — 문서·보고서가 연결된 공사는 지우지 않는다 */
export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("삭제할 공사를 찾을 수 없습니다.");

  const { data, error } = await getSupabase().from("projects").delete().eq("id", id).select("name");
  if (error) {
    // 표 설계(on delete restrict)에 따라, 연결된 문서·보고서가 있으면 DB가 삭제를 거부한다.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return fail("문서나 보고서가 연결된 공사는 삭제할 수 없습니다. 연결된 문서를 먼저 정리해주세요.");
    }
    console.error(`[DB 오류] 공사 삭제: ${error.code}`);
    return fail("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data?.length) return fail("삭제할 공사를 찾을 수 없습니다. 화면을 새로고침해주세요.");

  revalidatePath("/projects");
  return { ok: true, message: `"${data[0].name}"을(를) 삭제했습니다.` };
}
