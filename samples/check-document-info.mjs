// AI 문서 정보 읽기 정확도 확인 스크립트 (PLAN 17번, 30번 성공 기준 시험에도 사용)
// 실행: 개발 서버(npm run dev)를 켠 상태에서  node samples/check-document-info.mjs [서버주소]
// - 샘플 문서를 실제 업로드 창구로 올리고, AI가 읽은 공사·종류·작성일·대상 기간을 정답과 비교한다.
// - 감독지시서는 진짜 한글 파일이 아직 없으므로 원고로 "흉내 낸 .hwpx"를 만들어 올린다.
// - 끝나면 올린 문서의 id 목록을 samples/.build/uploaded-ids.json 에 남긴다. (정리할 때 사용)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import JSZip from "jszip";
import { CONTRACTOR_WRITTEN_OVERRIDE, MONTHLY_WRITTEN, PROJECTS } from "./sample-data.mjs";

const BASE = process.argv[2] ?? "http://localhost:3001";

const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
};

/** 정답표: 파일마다 기대하는 공사·종류·작성일·대상 기간 */
const cases = [];
for (const p of PROJECTS) {
  for (const ym of Object.keys(p.months)) {
    const [s, e] = monthRange(ym);
    cases.push({ file: `${p.short}_감리월간보고서_${ym}.pdf`, project: p.name, kind: "감리보고서", written: MONTHLY_WRITTEN[ym].supervision, period: [s, e] });
    cases.push({
      file: `${p.short}_업체월간보고서_${ym}.xlsx`,
      project: p.name,
      kind: "업체월간보고서",
      written: CONTRACTOR_WRITTEN_OVERRIDE[`${p.key}:${ym}`] ?? MONTHLY_WRITTEN[ym].contractor,
      period: [s, e],
    });
  }
  for (const w of p.weeks) {
    cases.push({ file: `${p.short}_업체주간보고서_${w.start}_${w.end.slice(8)}.xlsx`, project: p.name, kind: "업체주간보고서", written: w.written, period: [w.start, w.end] });
  }
  for (const o of p.orders) {
    cases.push({ file: `${p.short}_감독지시서_${o.date}.hwpx`, project: p.name, kind: "감독지시서", written: o.date, period: [o.date, o.date], manuscript: true });
  }
}

/** 원고(.txt)로 흉내 낸 .hwpx 만들기 */
async function mockHwpx(file) {
  const txt = readFileSync(`samples/hwpx-원고/${file.replace(/\.hwpx$/, ".txt")}`, "utf8").replace(/^﻿/, "");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = txt.split(/\r?\n/).map((l) => `<hp:p><hp:run><hp:t>${esc(l)}</hp:t></hp:run></hp:p>`).join("");
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file("Contents/section0.xml", `<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">${body}</hs:sec>`);
  return zip.generateAsync({ type: "uint8array" });
}

const mark = (ok) => (ok ? "✅" : "❌");
let correct = 0;
let total = 0;
const ids = [];
const started = Date.now();

for (const c of cases) {
  const bytes = c.manuscript ? await mockHwpx(c.file) : readFileSync(`samples/files/${c.file}`);
  const form = new FormData();
  form.append("file", new Blob([bytes]), c.file);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/documents`, { method: "POST", body: form });
  const body = await res.json();
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    console.log(`❌ ${c.file}: 올리기 실패 ${res.status} ${body.error}`);
    continue;
  }
  ids.push(body.document.id);
  const i = body.document.info;
  if (!i) {
    console.log(`❌ ${c.file}: AI가 정보를 읽지 못함 (${sec}초)`);
    total += 4;
    continue;
  }
  const checks = [
    i.projectName === c.project,
    i.docKind === c.kind,
    i.writtenDate === c.written,
    i.periodStart === c.period[0] && i.periodEnd === c.period[1],
  ];
  correct += checks.filter(Boolean).length;
  total += 4;
  const wrong = [];
  if (!checks[0]) wrong.push(`공사=${i.projectName}`);
  if (!checks[1]) wrong.push(`종류=${i.docKind}`);
  if (!checks[2]) wrong.push(`작성일=${i.writtenDate}(정답 ${c.written})`);
  if (!checks[3]) wrong.push(`기간=${i.periodStart}~${i.periodEnd}(정답 ${c.period.join("~")})`);
  console.log(
    `${checks.every(Boolean) ? "✅" : "⚠️"} ${c.file.padEnd(40)} 공사${mark(checks[0])} 종류${mark(checks[1])} 작성일${mark(checks[2])} 기간${mark(checks[3])} (${sec}초)${wrong.length ? "  → " + wrong.join(", ") : ""}`,
  );
}

console.log(`\n정확도: ${correct}/${total} 칸 (${((correct / total) * 100).toFixed(1)}%), 문서 ${cases.length}개, 총 ${((Date.now() - started) / 1000).toFixed(0)}초`);
mkdirSync("samples/.build", { recursive: true });
writeFileSync("samples/.build/uploaded-ids.json", JSON.stringify(ids));
