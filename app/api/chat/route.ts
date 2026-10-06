// POST /api/chat — 챗봇 답변 (DESIGN.md 6.1) — PLAN 26번: 자리만 만들어 둔다
// 실제 답변(문서 근거로 답하기)은 PLAN 27번에서 이 파일을 채운다.
export async function POST() {
  return Response.json({ error: "답변 기능은 준비 중입니다. (다음 작업에서 연결됩니다)" }, { status: 501 });
}
