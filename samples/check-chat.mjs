// 챗봇 성공 기준 시험 (PLAN 30번: SC-3 정답률, SC-4 출처 표시, SC-5 답변 시간)
// 실행: 개발 서버(npm run dev)를 켜고, 샘플 문서가 올라가 "확인"된 상태에서
//       node samples/check-chat.mjs [서버주소]        (기본 http://localhost:3001)
// - 질문 20개(chat-questions.mjs)를 하나씩 /api/chat 에 보내고 정답표와 비교한다.
// - 질문마다 앞 대화 없이 보낸다. (앞 질문의 공사가 섞이지 않게)
// - 결과는 화면에 표로 보여주고 samples/.build/chat-result.json 에 남긴다.
import { mkdirSync, writeFileSync } from "node:fs";
import { CHAT_QUESTIONS, NOT_FOUND } from "./chat-questions.mjs";

const BASE = process.argv[2] ?? "http://localhost:3001";

/** 쉼표·띄어쓰기를 지우고 비교 ("1,380,000,000 원" → "1380000000원") */
const squash = (s) => s.replace(/[,\s]/g, "");

function grade(c, res) {
  if (!res.ok) return { pass: false, why: `오류 ${res.status}` };
  const { answer = "", sources = [], askProject } = res.body;
  if (c.expect === "ask") {
    return askProject?.length ? { pass: true } : { pass: false, why: "되묻지 않음" };
  }
  if (c.expect === "notFound") {
    return answer.includes(NOT_FOUND) ? { pass: true } : { pass: false, why: "지어낸 답일 수 있음" };
  }
  if (answer.includes(NOT_FOUND) || askProject?.length) return { pass: false, why: "답을 못 찾음" };
  const text = squash(answer);
  const missing = c.must.filter((group) => !group.some((w) => text.includes(squash(w))));
  if (missing.length) return { pass: false, why: `빠짐: ${missing.map((g) => g[0]).join(", ")}` };
  if (sources.length === 0) return { pass: false, why: "근거 문서 없음" };
  return { pass: true };
}

const results = [];
for (const c of CHAT_QUESTIONS) {
  const started = Date.now();
  let res;
  try {
    const r = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: c.q, history: [] }),
    });
    res = { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
  } catch {
    res = { ok: false, status: "연결 실패", body: {} };
  }
  const seconds = (Date.now() - started) / 1000;
  const g = grade(c, res);
  results.push({ ...c, seconds, ...g, answer: res.body.answer ?? res.body.error ?? "", sources: res.body.sources ?? [], askProject: res.body.askProject });
  console.log(`${g.pass ? "✅" : "❌"} ${String(c.no).padStart(2)}. ${c.q} (${seconds.toFixed(1)}초)${g.pass ? "" : ` — ${g.why}`}`);
}

// 성공 기준 계산
const passed = results.filter((r) => r.pass).length;
const answered = results.filter((r) => r.expect === "answer" && !r.answer.includes(NOT_FOUND) && !r.askProject?.length);
const withSource = answered.filter((r) => r.sources.length > 0).length;
const times = results.map((r) => r.seconds);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const max = Math.max(...times);

console.log("\n── 성공 기준 ──");
console.log(`SC-3 정답률: ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%) — 목표 18개 이상 → ${passed >= 18 ? "✅ 충족" : "❌ 미충족"}`);
console.log(`SC-4 출처 표시: 답을 찾은 답변 ${withSource}/${answered.length} — 목표 100% → ${withSource === answered.length && answered.length > 0 ? "✅ 충족" : "❌ 미충족"}`);
console.log(`SC-5 답변 시간: 평균 ${avg.toFixed(1)}초, 최대 ${max.toFixed(1)}초 — 목표 30초 이내 → ${max <= 30 ? "✅ 충족" : "❌ 미충족"}`);

mkdirSync("samples/.build", { recursive: true });
writeFileSync("samples/.build/chat-result.json", JSON.stringify({ at: new Date().toISOString(), passed, total: results.length, avg, max, results }, null, 2));
console.log("\n자세한 답변: samples/.build/chat-result.json");
