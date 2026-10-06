// 읽을 수 있는 파일인지 판단 시험 (실행: npm test) — PLAN 16번
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "node:test";
import JSZip from "jszip";
import { UPLOAD_MESSAGES } from "../documents/upload-rules.ts";
import { explainExtractError, extractDocumentText } from "./index.ts";

const sample = (name: string) => new Uint8Array(readFileSync(`samples/files/${name}`));

/** 서버 기록(console.error)을 잠시 조용히 시킨다 */
async function quietly<T>(run: () => Promise<T>): Promise<T> {
  const spy = mock.method(console, "error", () => {});
  try {
    return await run();
  } finally {
    spy.mock.restore();
  }
}

describe("읽을 수 있는 파일", () => {
  for (const name of ["한빛청사_감리월간보고서_2026-08.pdf", "누리초_업체월간보고서_2026-09.xlsx", "하늘마루_업체주간보고서_2026-09-21_27.xlsx"]) {
    it(`${name} → 통과`, async () => {
      const result = await extractDocumentText(name.endsWith(".pdf") ? "pdf" : "xlsx", sample(name));
      assert.ok(result.ok);
    });
  }
});

describe("읽을 수 없는 파일 → 안내 문구", () => {
  it("스캔본 PDF (글자 없음)", async () => {
    const result = await extractDocumentText("pdf", sample("스캔본_누리초_감리월간보고서_2026-08.pdf"));
    assert.deepEqual(result, { ok: false, message: UPLOAD_MESSAGES.unreadable });
  });

  it("깨진 PDF", async () => {
    const result = await quietly(() => extractDocumentText("pdf", new TextEncoder().encode("%PDF-1.4 깨진 내용")));
    assert.deepEqual(result, { ok: false, message: UPLOAD_MESSAGES.unreadable });
  });

  it("깨진 엑셀", async () => {
    const result = await quietly(() => extractDocumentText("xlsx", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9])));
    assert.deepEqual(result, { ok: false, message: UPLOAD_MESSAGES.unreadable });
  });

  it("암호 걸린 한글 파일", async () => {
    const zip = new JSZip();
    zip.file("META-INF/manifest.xml", "<manifest><encryption-data/></manifest>");
    zip.file("Contents/section0.xml", "암호화된 내용");
    const result = await extractDocumentText("hwpx", new Uint8Array(await zip.generateAsync({ type: "uint8array" })));
    assert.deepEqual(result, { ok: false, message: UPLOAD_MESSAGES.encrypted });
  });

  it("글자가 50자 미만인 한글 파일", async () => {
    const zip = new JSZip();
    zip.file("Contents/section0.xml", '<hs:sec xmlns:hp="p" xmlns:hs="s"><hp:p><hp:run><hp:t>제목만 있음</hp:t></hp:run></hp:p></hs:sec>');
    const result = await extractDocumentText("hwpx", new Uint8Array(await zip.generateAsync({ type: "uint8array" })));
    assert.deepEqual(result, { ok: false, message: UPLOAD_MESSAGES.unreadable });
  });

  it("암호 걸린 PDF (PDF 도구가 PasswordException을 낼 때)", () => {
    const error = Object.assign(new Error("No password given"), { name: "PasswordException" });
    assert.equal(explainExtractError(error), UPLOAD_MESSAGES.encrypted);
  });
});
