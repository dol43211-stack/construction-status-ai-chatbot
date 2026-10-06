// 형식별 글자 꺼내기 입구 (DESIGN.md 4.2 흐름 ① 3단계)
// 문서 올리기는 형식과 상관없이 이 함수 하나만 부른다.
import type { FileType } from "@/lib/documents/upload-rules";
import { extractPdfText } from "./pdf.ts";

export async function extractText(type: FileType, bytes: Uint8Array): Promise<string> {
  switch (type) {
    case "pdf":
      return extractPdfText(bytes);
    case "xlsx": // PLAN 14번에서 만든다
    case "hwpx": // PLAN 15번에서 만든다
      return "";
  }
}
