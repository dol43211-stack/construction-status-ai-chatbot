// 한글 내려받기 파일 시험 (실행: npm test) — PLAN 25번
// 1) 압축 파일 구조가 한글 표준(OWPML)대로인지  2) 15번에서 만든 한글 읽기 도구로 다시 읽었을 때 내용이 그대로인지
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { buildHwpx, escapeXml } from "../hwpx/write.ts";
import { readHwpxText } from "../hwpx/read.ts";
import { NO_DATA, REPORT_ITEMS } from "../reports/items.ts";
import type { ExportableReport } from "./common.ts";
import { buildReportHwpx } from "./hwpx.ts";

const REPORT: ExportableReport = {
  projectName: "한빛청사 신축공사",
  periodType: "monthly",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  confirmedAt: "2026-10-06T10:30:00Z",
  items: REPORT_ITEMS.map(({ key, title }, i) => ({
    key,
    title,
    content: i === 0 ? "실적 42.5%임 (감리보고서 10.5.).\n<둘째 줄> & 특수문자" : NO_DATA,
    sources: i === 0 ? [{ documentId: "d1", fileName: "한빛청사_감리월간보고서_2026-09.pdf", writtenDate: "2026-10-05" }] : [],
    needsCheck: i === 0,
  })),
};

describe("한글 파일 구조", () => {
  it("mimetype이 맨 앞에 압축 없이 들어 있다", async () => {
    const bytes = await buildReportHwpx(REPORT);
    // zip 첫 항목의 이름은 30번째 바이트부터, 압축 방식(0=압축 없음)은 8번째 바이트
    const name = new TextDecoder().decode(bytes.subarray(30, 38));
    assert.equal(name, "mimetype");
    assert.equal(bytes[8] | (bytes[9] << 8), 0);
    const zip = await JSZip.loadAsync(bytes);
    assert.equal(await zip.file("mimetype")!.async("string"), "application/hwp+zip");
  });

  it("필수 파일이 모두 있다", async () => {
    const zip = await JSZip.loadAsync(await buildReportHwpx(REPORT));
    for (const f of ["version.xml", "settings.xml", "META-INF/container.xml", "META-INF/manifest.xml", "Contents/content.hpf", "Contents/header.xml", "Contents/section0.xml"]) {
      assert.ok(zip.file(f), f);
    }
  });

  it("header.xml의 개수 표시(itemCnt)가 실제 정의 개수와 같다", async () => {
    const zip = await JSZip.loadAsync(await buildReportHwpx(REPORT));
    const header = await zip.file("Contents/header.xml")!.async("string");
    for (const [list, item] of [["borderFills", "borderFill"], ["charProperties", "charPr"], ["paraProperties", "paraPr"], ["fontfaces", "fontface"]]) {
      const declared = Number(new RegExp(`<hh:${list} itemCnt="(\\d+)"`).exec(header)?.[1]);
      const actual = (header.match(new RegExp(`<hh:${item} `, "g")) ?? []).length;
      assert.equal(actual, declared, list);
    }
  });

  it("표의 행·칸 수 표시가 실제와 같다", async () => {
    const zip = await JSZip.loadAsync(await buildReportHwpx(REPORT));
    const section = await zip.file("Contents/section0.xml")!.async("string");
    const tables = [...section.matchAll(/<hp:tbl [^>]*rowCnt="(\d+)" colCnt="(\d+)"[^>]*>([\s\S]*?)<\/hp:tbl>/g)];
    assert.equal(tables.length, 2); // 머리 정보 표 + 보고서 표
    for (const [, rowCnt, colCnt, body] of tables) {
      const rows = body.split("<hp:tr>").length - 1;
      const cells = body.split("<hp:tc ").length - 1;
      assert.equal(rows, Number(rowCnt));
      assert.equal(cells, Number(rowCnt) * Number(colCnt));
    }
  });

  it("여는 태그와 닫는 태그 수가 맞다 (XML이 깨지지 않음)", async () => {
    const zip = await JSZip.loadAsync(await buildReportHwpx(REPORT));
    for (const f of ["Contents/header.xml", "Contents/section0.xml", "Contents/content.hpf"]) {
      const xml = await zip.file(f)!.async("string");
      const open = (xml.match(/<[A-Za-z][\w:.-]*(\s[^>]*)?(?<!\/)>/g) ?? []).length;
      const close = (xml.match(/<\/[A-Za-z][\w:.-]*>/g) ?? []).length;
      assert.equal(open, close, f);
    }
  });
});

describe("다시 읽었을 때 내용", () => {
  it("제목·머리 정보·표 머리·9개 항목이 순서대로 들어 있다", async () => {
    const text = await readHwpxText(await buildReportHwpx(REPORT));
    const lines = text.split("\n");
    assert.equal(lines[0], "한빛청사 신축공사 월간 진행현황 보고서");
    assert.ok(lines.includes("공사명 | 한빛청사 신축공사"));
    assert.ok(lines.includes("보고 기간 | 2026-09-01 ~ 2026-09-30 (월간)"));
    assert.ok(lines.includes("확정일 | 2026-10-06"));
    assert.ok(lines.includes("번호 | 항목 | 내용 | 근거 문서 | 확인 필요"));
    // 칸 안의 줄바꿈은 읽을 때 띄어쓰기로 이어진다
    assert.ok(lines.includes("1 | 공정률 | 실적 42.5%임 (감리보고서 10.5.). <둘째 줄> & 특수문자 | 한빛청사_감리월간보고서_2026-09.pdf | 확인 필요"));
    for (let i = 1; i < 9; i++) assert.ok(lines.includes(`${i + 1} | ${REPORT_ITEMS[i].title} | ${NO_DATA}`), REPORT_ITEMS[i].title);
  });

  it("XML 특수문자를 안전하게 바꾼다", () => {
    assert.equal(escapeXml(`<a> & "b"\u0001`), "&lt;a&gt; &amp; &quot;b&quot;");
  });

  it("글자만 있는 가장 단순한 파일도 만들 수 있다", async () => {
    const text = await readHwpxText(await buildHwpx("시험", [{ type: "paragraph", text: "첫 줄\n둘째 줄" }]));
    assert.equal(text, "첫 줄\n둘째 줄");
  });
});
