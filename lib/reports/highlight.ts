// 근거 문서 대조 도우미 — PLAN 21번
// 초안 항목에 나온 숫자(42.5%, 1,380,000,000원 등)를 근거 문서 원문에서 찾아 표시할 수 있게 나눈다.
// 비밀 값을 다루지 않으므로 화면·시험 어디서든 불러올 수 있다.

/** 항목 내용에서 대조할 숫자들을 뽑는다. (근거 표시 괄호 안의 날짜, 한 자리 숫자는 뺀다) */
export function numbersIn(content: string): string[] {
  const withoutCitations = content.replace(/\((?:[^()]*\d+\.\d+\.[^()]*)\)/g, ""); // "(감리보고서 10.5.)" 같은 근거 표시
  const found = withoutCitations.match(/\d[\d,]*(?:\.\d+)?(?:%p|%|원|건|명|톤|㎥|일|월|회|본|장|m)?/g) ?? [];
  return [...new Set(found.filter((n) => n.replace(/\D/g, "").length >= 2))].sort((a, b) => b.length - a.length);
}

export type Segment = { text: string; hit: boolean };

/** 원문을 "표시할 부분"과 "그냥 부분"으로 나눈다. 긴 숫자부터 찾아 짧은 숫자가 긴 숫자 안을 덮지 않게 한다. */
export function highlight(text: string, numbers: string[]): Segment[] {
  if (numbers.length === 0) return [{ text, hit: false }];
  const escaped = numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // 앞뒤가 다른 숫자에 붙어 있지 않을 때만 (예: "42.5%"를 찾을 때 "142.5%"는 빼기)
  const pattern = new RegExp(`(?<![\\d,.])(?:${escaped.join("|")})(?![\\d,])`, "g");
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), hit: false });
    segments.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), hit: false });
  return segments;
}
