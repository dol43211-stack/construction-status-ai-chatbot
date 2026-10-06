// PDF에서 글자 꺼내기 (DESIGN.md 4.2 흐름 ① 3단계) — PLAN 13번
// 글자층이 있는 PDF만 읽을 수 있다. 스캔본(그림뿐인 PDF)은 거의 빈 글자가 나온다.
import { extractText, getDocumentProxy } from "unpdf";
import { tidyText } from "./tidy.ts";

/** PDF 파일 내용에서 모든 쪽의 글자를 꺼낸다 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // PDF 읽기 도구가 받은 데이터를 옮겨 쓰는 경우가 있어, 원본이 망가지지 않게 복사본을 넘긴다.
  const pdf = await getDocumentProxy(bytes.slice());
  try {
    const { text } = await extractText(pdf, { mergePages: true });
    return tidyText(text);
  } finally {
    await pdf.loadingTask.destroy(); // 다 읽은 PDF가 메모리에 남지 않게 정리
  }
}
