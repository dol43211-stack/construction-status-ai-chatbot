// 질문이 어느 공사에 대한 것인지 찾기 (DESIGN.md 4.4 흐름 ③ 1~2단계) — PLAN 27번
// AI에게 맡기지 않고 코드로 이름을 맞춰 본다. 추측하지 않기 위해서다. (PRD M2 규칙 4)
// - 질문에 공사명(또는 줄인 이름, 예: "누리초")이 있으면 그 공사
// - 없으면 바로 앞 대화의 질문에서 찾는다 (예: "그럼 기성 실적은?")
// - 여러 공사에 해당하거나 아무 공사도 못 찾으면 되묻는다
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.

type Project = { id: string; name: string };

export type ProjectMatch =
  | { kind: "one"; project: Project }
  | { kind: "ask"; candidates: Project[] }; // 되물을 때 보여줄 공사들

/** 조사 떼기: "누리초는" → "누리초", "한빛청사의" → "한빛청사" */
const PARTICLES = /(에서는|에서|으로|에는|이랑|하고|은|는|이|가|의|에|를|을|도|와|과|랑|로)$/;
const words = (text: string) =>
  text
    .split(/[\s,.?!~·()]+/)
    .map((w) => w.replace(PARTICLES, ""))
    .filter((w) => w.length >= 2);

const noSpace = (s: string) => s.replace(/\s+/g, "");

/** 이 글에서 언급된 공사들 */
export function projectsMentioned(text: string, projects: Project[]): Project[] {
  const flat = noSpace(text);
  const ws = words(text);
  return projects.filter((p) => {
    const full = noSpace(p.name);
    const head = p.name.trim().split(/\s+/)[0]; // 공사명 첫 낱말 (예: "누리초등학교")
    if (flat.includes(full) || (head.length >= 2 && flat.includes(head))) return true;
    // 줄인 이름: 질문 낱말이 공사명 첫 낱말의 앞부분 (예: "누리초" → "누리초등학교")
    return ws.some((w) => w.length >= 2 && head.startsWith(w));
  });
}

/** 질문과 최근 대화로 공사를 정한다 */
export function matchProject(question: string, earlierQuestions: string[], projects: Project[]): ProjectMatch {
  const found = projectsMentioned(question, projects);
  if (found.length === 1) return { kind: "one", project: found[0] };
  if (found.length > 1) return { kind: "ask", candidates: found };

  // 질문에 공사가 없으면, 가장 최근 질문부터 거슬러 올라가며 찾는다
  for (const earlier of [...earlierQuestions].reverse()) {
    const before = projectsMentioned(earlier, projects);
    if (before.length === 1) return { kind: "one", project: before[0] };
    if (before.length > 1) break; // 앞에서도 여러 공사였다면 되묻는다
  }
  return { kind: "ask", candidates: projects };
}
