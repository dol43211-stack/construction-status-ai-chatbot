// 보고서 초안 성공 기준 시험 (PLAN 30번: SC-1 생성 시간, SC-2 항목 누락, SC-7 개인정보 노출)
// 실행: 개발 서버(npm run dev)를 켜고, 샘플 문서가 올라가 "확인"된 상태에서
//       node --env-file=.env --no-warnings samples/check-report.mjs [서버주소] [기간 YYYY-MM]
// - 공사 3건의 월간 초안을 실제 /api/reports/generate 로 만들고 시간을 잰다.
// - 저장된 초안의 9개 항목이 이름·순서대로 모두 있는지, 가리지 않은 개인정보가 없는지 확인한다.
// - 시험이 끝나면 이 시험이 새로 만든 초안은 지운다. (이미 있던 초안을 덮어쓴 경우는 남긴다)
// - .env 의 값은 접속에만 쓰고 화면에 출력하지 않는다.
import { createClient } from "@supabase/supabase-js";
import { REPORT_ITEMS } from "../lib/reports/items.ts";
import { maskPersonalInfo } from "../lib/masking.ts";

const BASE = process.argv[2] ?? "http://localhost:3001";
const MONTH = process.argv[3] ?? "2026-09";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 값이 없습니다. --env-file=.env 로 실행해주세요.");
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: projects, error } = await supabase.from("projects").select("id, name").order("name");
if (error) throw new Error(`공사 읽기 실패: ${error.code}`);

const results = [];
const created = [];
for (const p of projects) {
  const started = Date.now();
  const r = await fetch(`${BASE}/api/reports/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: p.id, periodType: "monthly", value: MONTH }),
  });
  const seconds = (Date.now() - started) / 1000;
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    results.push({ name: p.name, seconds, ok: false, why: body.error ?? `오류 ${r.status}` });
    console.log(`❌ ${p.name} — ${body.error ?? r.status}`);
    continue;
  }
  if (!body.overwritten) created.push(body.reportId);

  const { data: report } = await supabase.from("reports").select("items").eq("id", body.reportId).single();
  const items = report?.items ?? [];
  const inOrder =
    items.length === REPORT_ITEMS.length &&
    REPORT_ITEMS.every((it, i) => items[i]?.key === it.key && items[i]?.title === it.title && items[i]?.content?.trim());
  const leaked = items.filter((it) => maskPersonalInfo(it.content) !== it.content).map((it) => it.title);
  const needsCheck = items.filter((it) => it.needsCheck).map((it) => it.title);

  results.push({ name: p.name, seconds, ok: true, inOrder, leaked, needsCheck });
  console.log(
    `${inOrder && leaked.length === 0 ? "✅" : "❌"} ${p.name} ${MONTH} 월간 초안 — ${seconds.toFixed(1)}초, ` +
      `9개 항목 ${inOrder ? "순서대로 모두 있음" : "누락·순서 틀림"}, 개인정보 노출 ${leaked.length}건` +
      (needsCheck.length ? `, 확인 필요: ${needsCheck.join("·")}` : ""),
  );
}

// 이 시험이 새로 만든 초안만 정리
if (created.length) {
  const { error: delError } = await supabase.from("reports").delete().in("id", created).eq("status", "draft");
  console.log(delError ? `⚠️ 시험 초안 정리 실패: ${delError.code}` : `\n시험으로 만든 초안 ${created.length}건을 정리했습니다.`);
}

const ok = results.filter((r) => r.ok);
const max = Math.max(...results.map((r) => r.seconds));
console.log("\n── 성공 기준 ──");
console.log(`SC-1 초안 생성 시간: 최대 ${max.toFixed(1)}초 — 목표 2분 이내 → ${ok.length === results.length && max <= 120 ? "✅ 충족" : "❌ 미충족"}`);
console.log(`SC-2 9개 항목 누락: ${ok.filter((r) => !r.inOrder).length}건 — 목표 0건 → ${ok.length === results.length && ok.every((r) => r.inOrder) ? "✅ 충족" : "❌ 미충족"}`);
console.log(`SC-7 초안 속 개인정보 노출: ${ok.reduce((n, r) => n + r.leaked.length, 0)}건 — 목표 0건 → ${ok.every((r) => r.leaked.length === 0) ? "✅ 충족" : "❌ 미충족"}`);
