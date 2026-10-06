// 샘플 문서 만들기 스크립트 (PLAN.md 6번 작업)
// 실행: node samples/generate-samples.mjs
// - 감리 월간보고서 → PDF (Windows에 기본 설치된 Edge 브라우저로 인쇄)
// - 업체 주간·월간보고서 → 엑셀(.xlsx)
// - 감독지시서 → 한글 원고(.txt) — 사용자가 한글 프로그램에서 .hwpx로 저장
// - 스캔 PDF(글자 없는 그림 PDF) 1개 → "읽을 수 없는 파일" 시험용
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import {
  CONTRACTOR_WRITTEN_OVERRIDE,
  MONTHLY_WRITTEN,
  PROJECTS,
  REPORT_ITEMS,
} from "./sample-data.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "files"); // 업로드용 완성 파일
const MANUSCRIPT = join(ROOT, "hwpx-원고"); // 한글로 저장할 원고
const BUILD = join(ROOT, ".build"); // PDF를 만들기 위한 중간 파일 (커밋하지 않음)
for (const dir of [OUT, MANUSCRIPT, BUILD]) mkdirSync(dir, { recursive: true });

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_PATHS.find((p) => existsSync(p));
if (!EDGE) throw new Error("Edge 브라우저를 찾을 수 없어 PDF를 만들 수 없습니다.");

// ─────────────── 공통 도우미 ───────────────

/** "2026-08" → "2026년 8월" */
const monthLabel = (ym) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;

/** "2026-08" → { start: "2026-08-01", end: "2026-08-31" } */
function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, "0")}` };
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 항목 내용 만들기. who = "supervision"(감리) | "contractor"(업체). 내용이 없으면 null(항목 자체를 뺀다) */
function itemText(month, key, who) {
  if (key === "progress") {
    const actual = who === "supervision" ? month.progress.actual : month.progress.contractorActual;
    const gap = (actual - month.progress.plan).toFixed(1);
    return `계획 ${month.progress.plan.toFixed(1)}% / 실적 ${actual.toFixed(1)}% (계획 대비 ${gap > 0 ? "+" : ""}${gap}%p)`;
  }
  return month[key];
}

/**
 * Edge 실행 후 결과 파일이 생길 때까지 기다린다.
 * Edge 실행 프로그램은 먼저 끝나고 파일은 잠시 뒤에 써지므로, 최대 30초 동안 확인한다.
 */
async function runEdge(args, outPath) {
  rmSync(outPath, { force: true }); // 예전 결과가 남아 있으면 새로 만든 것으로 착각하므로 먼저 치운다
  execFileSync(EDGE, ["--headless", "--disable-gpu", `--user-data-dir=${join(BUILD, "edge-profile")}`, ...args], {
    stdio: "ignore",
  });
  let lastSize = -1;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (existsSync(outPath)) {
      const size = statSync(outPath).size;
      if (size > 0 && size === lastSize) return; // 크기가 더 늘지 않으면 다 써진 것
      lastSize = size;
    }
  }
  throw new Error(`Edge 결과 파일이 만들어지지 않았습니다: ${outPath}`);
}

/** Edge로 HTML을 PDF로 인쇄 */
const printPdf = (htmlPath, pdfPath) =>
  runEdge(["--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], pdfPath);

/** Edge로 HTML 화면을 PNG 그림으로 저장 (스캔본 흉내) */
const screenshot = (htmlPath, pngPath) =>
  runEdge(
    ["--hide-scrollbars", "--window-size=1240,1754", `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href],
    pngPath,
  );

const created = [];

// ─────────────── 1. 감리 월간보고서 (PDF) ───────────────

function supervisionHtml(p, ym, month) {
  const range = monthRange(ym);
  const rows = REPORT_ITEMS.map(([key, title], i) => {
    const text = itemText(month, key, "supervision");
    if (text == null) return ""; // trap: 언급이 없는 항목은 문서에서 아예 뺀다
    return `<h2>${i + 1}. ${title}</h2><p>${escapeHtml(text)}</p>`;
  }).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 18mm; }
    body { font-family: "Malgun Gothic", sans-serif; font-size: 11pt; line-height: 1.6; color: #111; }
    h1 { text-align: center; font-size: 20pt; letter-spacing: 4px; margin: 0 0 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th, td { border: 1px solid #444; padding: 6px 8px; text-align: left; }
    th { background: #eee; width: 22%; }
    h2 { font-size: 12pt; margin: 14px 0 4px; border-bottom: 1px solid #999; }
    p { margin: 0 0 6px; }
    .sign { margin-top: 28px; text-align: right; }
  </style></head><body>
    <h1>감리 월간보고서</h1>
    <table>
      <tr><th>공사명</th><td>${p.name}</td></tr>
      <tr><th>시공사</th><td>${p.contractor}</td></tr>
      <tr><th>감리단</th><td>${p.supervisor}</td></tr>
      <tr><th>계약금액</th><td>${p.contractAmount}</td></tr>
      <tr><th>공사기간</th><td>${p.term}</td></tr>
      <tr><th>보고기간</th><td>${range.start} ~ ${range.end} (${monthLabel(ym)}분)</td></tr>
      <tr><th>작성일</th><td>${MONTHLY_WRITTEN[ym].supervision}</td></tr>
    </table>
    ${rows}
    <p class="sign">${p.supervisor} 책임감리원 (서명 생략)</p>
  </body></html>`;
}

for (const p of PROJECTS) {
  for (const [ym, month] of Object.entries(p.months)) {
    const base = `${p.short}_감리월간보고서_${ym}`;
    const html = join(BUILD, `${base}.html`);
    writeFileSync(html, supervisionHtml(p, ym, month));
    await printPdf(html, join(OUT, `${base}.pdf`));
    created.push(`${base}.pdf`);

    // trap: 누리초 8월 감리보고서의 "스캔본" — 글자 없이 그림만 있는 PDF
    if (p.key === "nuri" && ym === "2026-08") {
      const png = join(BUILD, `${base}.png`);
      await screenshot(html, png);
      const imgHtml = join(BUILD, `스캔본_${base}.html`);
      writeFileSync(imgHtml, `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: A4; margin: 0; } body { margin: 0; } img { width: 100%; display: block; }
      </style></head><body><img src="${pathToFileURL(png).href}"></body></html>`);
      await printPdf(imgHtml, join(OUT, `스캔본_${base}.pdf`));
      created.push(`스캔본_${base}.pdf`);
    }
  }
}

// ─────────────── 2. 업체 주간·월간보고서 (엑셀) ───────────────

/** 보고서 머리 부분(제목·공사 정보)을 시트에 쓴다 */
function writeHeader(sheet, title, info) {
  sheet.columns = [{ width: 24 }, { width: 90 }];
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { size: 16, bold: true };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  info.forEach(([k, v], i) => {
    const row = sheet.getRow(i + 3);
    row.values = [k, v];
    row.getCell(1).font = { bold: true };
  });
  return info.length + 4; // 다음에 쓸 행 번호
}

/** 표(구분 | 내용)를 시트에 쓴다 */
function writeTable(sheet, startRow, rows) {
  const head = sheet.getRow(startRow);
  head.values = ["구분", "내용"];
  head.font = { bold: true };
  rows.forEach(([k, v], i) => {
    const row = sheet.getRow(startRow + 1 + i);
    row.values = [k, v];
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  for (let r = startRow; r <= startRow + rows.length; r++) {
    for (const c of [1, 2]) {
      sheet.getRow(r).getCell(c).border = {
        top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
      };
    }
  }
}

for (const p of PROJECTS) {
  // 2-1. 업체 월간보고서
  for (const [ym, month] of Object.entries(p.months)) {
    const range = monthRange(ym);
    const written = CONTRACTOR_WRITTEN_OVERRIDE[`${p.key}:${ym}`] ?? MONTHLY_WRITTEN[ym].contractor;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("월간보고");
    const next = writeHeader(sheet, `공사 월간 진행보고서 (${monthLabel(ym)})`, [
      ["공사명", p.name],
      ["시공사", p.contractor],
      ["사업자등록번호", p.bizNo],
      ["보고기간", `${range.start} ~ ${range.end}`],
      ["작성일", written],
    ]);
    const rows = [];
    for (const [key, title] of REPORT_ITEMS) {
      let text = itemText(month, key, "contractor");
      if (text == null) continue; // trap: 언급이 없는 항목은 뺀다
      // trap: 개인정보를 해당 항목에 덧붙인다 (가림 처리 시험용)
      if (month.personal && key === "accident") text += `\n${month.personal[0]}`;
      if (month.personal && key === "wages") text += `\n${month.personal[1]}`;
      rows.push([title, text]);
    }
    writeTable(sheet, next, rows);
    const file = `${p.short}_업체월간보고서_${ym}.xlsx`;
    await wb.xlsx.writeFile(join(OUT, file));
    created.push(file);
  }

  // 2-2. 업체 주간보고서
  for (const w of p.weeks) {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("주간보고");
    // trap: 하늘마루 주간보고서는 줄인 공사명을 쓴다
    const name = p.key === "haneul" ? p.variantName : p.name;
    const next = writeHeader(sheet, "공사 주간 진행보고서", [
      ["공사명", name],
      ["시공사", p.contractor],
      ["보고기간", `${w.start}(월) ~ ${w.end}(일)`],
      ["작성일", w.written],
    ]);
    const rows = [
      ["금주 공정률", `계획 ${w.plan.toFixed(1)}% / 실적 ${w.actual.toFixed(1)}%`],
      ["금주 주요 작업", w.work],
      ["차주 작업 계획", w.next],
      ["관급자재 반입", w.materials],
      ["투입 인원(연인원)", `${w.workers}명`],
    ];
    if (w.safety != null) rows.push(["안전(건설사고)", w.safety]); // trap: 누리초 8월은 안전 항목 자체가 없다
    rows.push(["특이사항", w.note]);
    writeTable(sheet, next, rows);
    const file = `${p.short}_업체주간보고서_${w.start}_${w.end.slice(8)}.xlsx`;
    await wb.xlsx.writeFile(join(OUT, file));
    created.push(file);
  }
}

// ─────────────── 3. 감독지시서 (한글 원고) ───────────────

for (const p of PROJECTS) {
  for (const o of p.orders) {
    // trap: 한빛청사 감독지시서는 줄인 공사명을 쓴다
    const name = p.key === "hanbit" ? p.variantName : p.name;
    const text = [
      "감 독 지 시 서",
      "",
      `지시번호: ${o.no}`,
      `지시일자: ${o.date}`,
      `공 사 명: ${name}`,
      `수    신: ${p.contractor} 현장대리인`,
      "발    신: 서울지방조달청 공사관리과 공사감독관",
      "",
      `제    목: ${o.title}`,
      "",
      "지시 내용:",
      o.body,
      "",
      `조치 기한: ${o.due}`,
      "",
      "위와 같이 지시하오니 기한 내 조치하고 결과를 보고하시기 바랍니다.",
    ].join("\r\n");
    const file = `${p.short}_감독지시서_${o.date}.txt`;
    // 한글 프로그램에서 깨지지 않도록 UTF-8 BOM을 붙인다
    writeFileSync(join(MANUSCRIPT, file), "\uFEFF" + text);
    created.push(`hwpx-원고/${file}`);
  }
}

console.log(`샘플 파일 ${created.length}개를 만들었습니다.`);
for (const f of created) console.log(`  - ${f}`);
console.log(`\n출력 폴더: ${resolve(OUT)}`);
