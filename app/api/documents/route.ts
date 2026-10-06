// POST /api/documents — 문서 1개 올리기 (DESIGN.md 4.2 흐름 ①, 6.1) — PLAN 11번
// 처리 순서: 형식·크기 다시 검사 → 파일 서명 확인 → 지문(해시)으로 중복 확인 → 장부(documents 표)에 기록 → 보관함에 원본 저장
// - 보관함 경로는 한글 파일 이름 대신 "문서번호.확장자"로 한다. (설계 검토 I-7: 한글 경로 오류 방지)
// - 원래 파일 이름은 장부의 file_name 칸에만 남긴다.
// - 글자 꺼내기(PLAN 13~15)와 AI 정보 읽기(PLAN 17)는 이후 작업에서 이 흐름 뒤에 붙인다.
import { createHash, randomUUID } from "node:crypto";
import {
  checkFile,
  duplicateMessage,
  fileTypeOf,
  matchesSignature,
  UPLOAD_MESSAGES,
} from "@/lib/documents/upload-rules";
import { DOCUMENTS_BUCKET, getSupabase } from "@/lib/supabase";

const SAVE_FAILED = "문서를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
const UNIQUE_VIOLATION = "23505"; // PostgreSQL: 같은 값이 이미 있음

const reply = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request) {
  // 1. 파일 받기
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return reply(400, { error: "올릴 파일을 찾을 수 없습니다." });

  // 2. 이름·크기 검사 (화면에서 이미 했지만 서버에서 한 번 더)
  const problem = checkFile(file.name, file.size);
  const type = fileTypeOf(file.name);
  if (problem || !type) return reply(400, { error: problem ?? UPLOAD_MESSAGES.wrongType });

  // 3. 파일 서명 확인 (확장자만 바꾼 파일 거르기)
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(type, bytes.subarray(0, 4))) return reply(400, { error: UPLOAD_MESSAGES.fakeType });

  // 4. 같은 내용의 문서가 이미 있는지 지문(해시)으로 확인 (PLAN 12번)
  //    파일 이름이 달라도 내용이 같으면 같은 문서로 본다.
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("documents")
    .select("file_name")
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (lookupError) {
    console.error(`[DB 오류] 중복 확인: ${lookupError.code}`);
    return reply(500, { error: SAVE_FAILED });
  }
  if (existing) return reply(409, { error: duplicateMessage(existing.file_name) });

  // 5. 장부에 기록
  const id = randomUUID();
  const storagePath = `${id}.${type}`;
  const { error: insertError } = await supabase.from("documents").insert({
    id,
    file_name: file.name,
    file_type: type,
    storage_path: storagePath,
    content_hash: contentHash,
  });
  if (insertError) {
    // 두 사람이 같은 파일을 거의 동시에 올리면 위 확인을 둘 다 통과할 수 있다.
    // 이때는 content_hash 중복 금지 규칙이 두 번째 기록을 막으므로 같은 안내를 보낸다.
    if (insertError.code === UNIQUE_VIOLATION) return reply(409, { error: duplicateMessage() });
    console.error(`[DB 오류] 문서 기록: ${insertError.code}`);
    return reply(500, { error: SAVE_FAILED });
  }

  // 6. 보관함에 원본 저장. 실패하면 방금 쓴 장부 기록을 되돌린다.
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    console.error(`[보관함 오류] 문서 저장: ${uploadError.name}`);
    await supabase.from("documents").delete().eq("id", id);
    return reply(500, { error: SAVE_FAILED });
  }

  return reply(201, { document: { id, fileName: file.name, fileType: type } });
}
