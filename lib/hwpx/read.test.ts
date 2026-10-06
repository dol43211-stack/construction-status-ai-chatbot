// 한글(.hwpx) 읽기 시험 (실행: npm test)
// 진짜 한글 파일 대신, OWPML 표준 구조를 따른 "흉내 낸 .hwpx"를 메모리에서 만들어 시험한다.
// (사용자가 한글에서 저장한 진짜 파일이 생기면 samples/files 로 다시 확인한다)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { HwpxEncryptedError, readHwpxText } from "./read.ts";

const NS =
  'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"';

/** 문단 하나 (한글이 실제로 쓰는 모양: p > run > t) */
const p = (inner: string) => `<hp:p id="0" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0">${inner}</hp:run></hp:p>`;
const t = (text: string) => `<hp:t>${text}</hp:t>`;

/** 표 (행마다 칸 글자 목록) — 표는 문단 안의 run 안에 들어간다 */
const table = (rows: string[][]) =>
  p(
    `<hp:tbl rowCnt="${rows.length}" colCnt="${rows[0].length}">` +
      rows
        .map(
          (row) =>
            `<hp:tr>${row.map((cell) => `<hp:tc><hp:subList>${cell.split("\n").map((line) => p(t(line))).join("")}</hp:subList></hp:tc>`).join("")}</hp:tr>`,
        )
        .join("") +
      `</hp:tbl>`,
  );

/** 흉내 낸 .hwpx 파일 만들기 */
async function makeHwpx(sections: string[], options: { encrypted?: boolean } = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file(
    "META-INF/manifest.xml",
    options.encrypted
      ? '<manifest><file-entry full-path="Contents/section0.xml"><encryption-data/></file-entry></manifest>'
      : "<manifest/>",
  );
  const items = sections.map((_, i) => `<opf:item id="section${i}" href="Contents/section${i}.xml" media-type="application/xml"/>`);
  const refs = sections.map((_, i) => `<opf:itemref idref="section${i}" linear="yes"/>`);
  zip.file(
    "Contents/content.hpf",
    `<opf:package xmlns:opf="http://www.idpf.org/2007/opf/"><opf:manifest><opf:item id="header" href="Contents/header.xml"/>${items.join("")}</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/>${refs.join("")}</opf:spine></opf:package>`,
  );
  sections.forEach((body, i) => zip.file(`Contents/section${i}.xml`, `<?xml version="1.0" encoding="UTF-8"?><hs:sec ${NS}>${body}</hs:sec>`));
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}

describe("한글 본문 꺼내기", () => {
  it("문단을 한 줄씩 꺼낸다", async () => {
    const bytes = await makeHwpx([p(t("감 독 지 시 서")) + p(t("공 사 명: 한빛청사 신축")) + p(t("조치 기한: 2026-08-22"))]);
    assert.equal(await readHwpxText(bytes), "감 독 지 시 서\n공 사 명: 한빛청사 신축\n조치 기한: 2026-08-22");
  });

  it("한 문단 안에 글자가 여러 조각(run)으로 나뉘어 있어도 이어 붙인다", async () => {
    const bytes = await makeHwpx([
      `<hp:p><hp:run>${t("공정률 ")}</hp:run><hp:run charPrIDRef="3">${t("42.5%")}</hp:run><hp:run>${t(" (굵게 표시)")}</hp:run></hp:p>`,
    ]);
    assert.equal(await readHwpxText(bytes), "공정률 42.5% (굵게 표시)");
  });

  it("표는 '칸 | 칸' 줄로, 칸 안의 여러 줄은 띄어쓰기로 잇는다", async () => {
    const bytes = await makeHwpx([
      p(t("현황표")) + table([["구분", "내용"], ["공정률", "계획 36.0%\n실적 35.2%"]]) + p(t("끝")),
    ]);
    assert.equal(await readHwpxText(bytes), "현황표\n구분 | 내용\n공정률 | 계획 36.0% 실적 35.2%\n끝");
  });

  it("XML 특수문자와 탭·줄바꿈 표시를 원래 글자로 바꾼다", async () => {
    const bytes = await makeHwpx([
      p(t("A &amp; B &lt;주&gt; &#44032;&#xB098;")) + p(`<hp:t>번호<hp:tab/>내용<hp:lineBreak/>둘째 줄</hp:t>`),
    ]);
    assert.equal(await readHwpxText(bytes), "A & B <주> 가나\n번호 내용\n둘째 줄");
  });

  it("구역(section)이 여러 개면 문서 순서대로 잇는다", async () => {
    const bytes = await makeHwpx([p(t("1쪽 내용")), p(t("2쪽 내용"))]);
    assert.equal(await readHwpxText(bytes), "1쪽 내용\n2쪽 내용");
  });

  it("샘플 감독지시서 원고를 그대로 담은 파일을 꺼내면 원고와 같다", async () => {
    const manuscript = readFileSync("samples/hwpx-원고/한빛청사_감독지시서_2026-09-18.txt", "utf8").replace(/^﻿/, "");
    const lines = manuscript.split(/\r?\n/).filter((l) => l.trim());
    const bytes = await makeHwpx([lines.map((l) => p(t(l.replace(/&/g, "&amp;").replace(/</g, "&lt;")))).join("")]);
    // 연속된 띄어쓰기("수    신")는 하나로 줄어든다 (글자 다듬기 규칙)
    assert.equal(await readHwpxText(bytes), lines.map((l) => l.replace(/\s+/g, " ").trim()).join("\n"));
  });
});

describe("읽을 수 없는 한글 파일", () => {
  it("암호가 걸린 파일은 HwpxEncryptedError", async () => {
    const bytes = await makeHwpx([p(t("비밀"))], { encrypted: true });
    await assert.rejects(readHwpxText(bytes), HwpxEncryptedError);
  });

  it("본문(section)이 없는 압축 파일은 오류", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/hwp+zip");
    await assert.rejects(readHwpxText(new Uint8Array(await zip.generateAsync({ type: "uint8array" }))));
  });

  it("압축 파일이 아니면 오류", async () => {
    await assert.rejects(readHwpxText(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])));
  });
});
