// 꺼낸 글자 다듬기 (PDF·엑셀·한글 공통)
// 줄 끝 공백을 지우고, 빈 줄이 여러 개 이어지면 하나로 줄인다.
export function tidyText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
