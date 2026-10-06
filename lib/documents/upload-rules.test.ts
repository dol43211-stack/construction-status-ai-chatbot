// 문서 올리기 규칙 시험 (실행: npm test)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkFile,
  duplicateMessage,
  fileTypeOf,
  isReadableText,
  matchesSignature,
  MAX_FILE_BYTES,
  MIN_READABLE_CHARS,
  signatureMismatchMessage,
  UPLOAD_MESSAGES,
} from "./upload-rules.ts";

describe("중복 안내 문구", () => {
  it("먼저 올린 파일 이름을 알면 함께 알려준다", () => {
    assert.equal(
      duplicateMessage("한빛청사_감리월간보고서_2026-08.pdf"),
      "이미 올라온 문서입니다. (먼저 올린 파일: 한빛청사_감리월간보고서_2026-08.pdf)",
    );
  });
  it("모르면 기본 문구만", () => {
    assert.equal(duplicateMessage(), UPLOAD_MESSAGES.duplicate);
  });
});

describe("형식 알아내기", () => {
  it("허용한 세 형식은 대소문자와 상관없이 알아본다", () => {
    assert.equal(fileTypeOf("한빛청사_감리월간보고서_2026-08.pdf"), "pdf");
    assert.equal(fileTypeOf("감독지시서.HWPX"), "hwpx");
    assert.equal(fileTypeOf("주간보고.xlsx"), "xlsx");
  });
  it("그 밖의 형식은 null", () => {
    for (const name of ["사진.jpg", "보고서.docx", "옛날.xls", "확장자없음"]) assert.equal(fileTypeOf(name), null);
  });
});

describe("이름·크기 검사", () => {
  it("정상 파일은 통과", () => {
    assert.equal(checkFile("보고서.pdf", 1000), null);
    assert.equal(checkFile("보고서.pdf", MAX_FILE_BYTES), null); // 딱 4MB는 허용
  });
  it("옛 한글(.hwp)은 다시 저장하라고 안내한다", () => {
    assert.equal(checkFile("감독지시서.hwp", 1000), UPLOAD_MESSAGES.oldHwp);
  });
  it("허용하지 않는 형식", () => {
    assert.equal(checkFile("사진.jpg", 1000), UPLOAD_MESSAGES.wrongType);
  });
  it("4MB 초과와 빈 파일", () => {
    assert.equal(checkFile("큰파일.pdf", MAX_FILE_BYTES + 1), UPLOAD_MESSAGES.tooBig);
    assert.equal(checkFile("빈파일.pdf", 0), UPLOAD_MESSAGES.empty);
  });
});

describe("서명이 다를 때 안내 문구 고르기", () => {
  const compound = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]); // 복합 문서
  it("복합 문서인 .xlsx → 암호 걸린 엑셀이거나 옛 .xls", () => {
    assert.equal(signatureMismatchMessage("xlsx", compound), UPLOAD_MESSAGES.lockedOrOldXlsx);
  });
  it("복합 문서인 .hwpx → 이름만 바꾼 옛 .hwp", () => {
    assert.equal(signatureMismatchMessage("hwpx", compound), UPLOAD_MESSAGES.oldHwp);
  });
  it("그 밖에는 확장자와 내용이 다르다는 안내", () => {
    assert.equal(signatureMismatchMessage("pdf", new Uint8Array([0x89, 0x50, 0x4e, 0x47])), UPLOAD_MESSAGES.fakeType);
  });
});

describe("글자 양으로 읽을 수 있는지 판단", () => {
  it(`공백을 뺀 글자가 ${MIN_READABLE_CHARS}자 이상이면 읽을 수 있음`, () => {
    assert.ok(isReadableText("가".repeat(MIN_READABLE_CHARS)));
    assert.ok(!isReadableText("가".repeat(MIN_READABLE_CHARS - 1) + " \n\n   "));
    assert.ok(!isReadableText(""));
  });
});

describe("파일 서명 확인", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK..
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // 그림 파일

  it("내용이 확장자와 맞으면 통과", () => {
    assert.ok(matchesSignature("pdf", pdf));
    assert.ok(matchesSignature("xlsx", zip));
    assert.ok(matchesSignature("hwpx", zip));
  });
  it("확장자만 바꾼 파일은 거른다", () => {
    assert.ok(!matchesSignature("pdf", png));
    assert.ok(!matchesSignature("xlsx", pdf));
  });
});
