// 형식별 글자 꺼내기 입구 (DESIGN.md 4.2 흐름 ① 3단계)
// 문서 올리기는 형식과 상관없이 extractDocumentText 하나만 부른다.
import { isReadableText, UPLOAD_MESSAGES, type FileType } from "../documents/upload-rules.ts";
import { HwpxEncryptedError, readHwpxText } from "../hwpx/read.ts";
import { extractPdfText } from "./pdf.ts";
import { tidyText } from "./tidy.ts";
import { extractXlsxText } from "./xlsx.ts";

export async function extractText(type: FileType, bytes: Uint8Array): Promise<string> {
  switch (type) {
    case "pdf":
      return extractPdfText(bytes);
    case "xlsx":
      return extractXlsxText(bytes);
    case "hwpx":
      return tidyText(await readHwpxText(bytes));
  }
}

export type ExtractResult = { ok: true; text: string } | { ok: false; message: string };

/**
 * 글자를 꺼내고, 읽을 수 있는 파일인지 판단한다. — PLAN 16번
 * 읽을 수 없는 경우(스캔본·암호·깨진 파일)는 사용자에게 보여줄 안내 문구를 돌려준다.
 */
export async function extractDocumentText(type: FileType, bytes: Uint8Array): Promise<ExtractResult> {
  let text: string;
  try {
    text = await extractText(type, bytes);
  } catch (error) {
    return { ok: false, message: explainExtractError(error) };
  }
  if (!isReadableText(text)) return { ok: false, message: UPLOAD_MESSAGES.unreadable };
  return { ok: true, text };
}

/** 글자 꺼내기 오류를 사용자 안내 문구로 바꾼다 */
export function explainExtractError(error: unknown): string {
  // PDF 도구는 암호 걸린 파일에 PasswordException을 낸다
  const isEncrypted =
    error instanceof HwpxEncryptedError || (error instanceof Error && error.name === "PasswordException");
  if (!isEncrypted) {
    console.error(`[글자 꺼내기 오류] ${error instanceof Error ? error.name : "알 수 없음"}`);
  }
  return isEncrypted ? UPLOAD_MESSAGES.encrypted : UPLOAD_MESSAGES.unreadable;
}
