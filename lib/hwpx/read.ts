// 한글(.hwpx) 읽기 (DESIGN.md 7.2) — PLAN 15번
// .hwpx는 압축(zip) 파일이고, 본문은 Contents/section0.xml, section1.xml … 에 XML로 들어 있다. (OWPML 표준)
// - 본문 글자는 <hp:t> 안에 있고, 문단은 <hp:p>, 표는 <hp:tbl> → <hp:tr>(행) → <hp:tc>(칸)이다.
// - 문단은 한 줄씩, 표는 "칸 | 칸 | 칸" 한 줄씩 꺼낸다. 표 칸 안의 여러 문단은 띄어쓰기로 잇는다.
// - 암호가 걸린 파일은 본문이 암호화되어 있어 읽을 수 없으므로 오류를 낸다.
import JSZip from "jszip";

export class HwpxEncryptedError extends Error {
  constructor() {
    super("암호가 걸린 한글 파일입니다.");
    this.name = "HwpxEncryptedError";
  }
}

/** .hwpx 파일 내용에서 본문 글자를 꺼낸다 */
export async function readHwpxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);

  const manifest = await zip.file("META-INF/manifest.xml")?.async("string");
  if (manifest?.includes("encryption-data")) throw new HwpxEncryptedError();

  const sections = await sectionPaths(zip);
  if (sections.length === 0) throw new Error("한글 본문(section)을 찾을 수 없습니다.");

  const texts: string[] = [];
  for (const path of sections) {
    const xml = await zip.file(path)?.async("string");
    if (xml) texts.push(sectionText(xml));
  }
  return texts.join("\n");
}

/** 본문 구역 파일들을 문서 순서대로 찾는다. (목차 파일 content.hpf의 순서 → 없으면 번호 순) */
async function sectionPaths(zip: JSZip): Promise<string[]> {
  const exists = (p: string) => zip.file(p) !== null;
  const hpf = await zip.file("Contents/content.hpf")?.async("string");
  if (hpf) {
    // <opf:item id="section0" href="Contents/section0.xml" …/> 와 <opf:itemref idref="section0"/>
    const hrefById = new Map<string, string>();
    for (const m of hpf.matchAll(/<(?:\w+:)?item\b[^>]*>/g)) {
      const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
      const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
      if (id && href) hrefById.set(id, href.startsWith("Contents/") ? href : `Contents/${href}`);
    }
    const ordered = [...hpf.matchAll(/<(?:\w+:)?itemref\b[^>]*\bidref="([^"]+)"/g)]
      .map((m) => hrefById.get(m[1]))
      .filter((p): p is string => !!p && /section\d+\.xml$/.test(p) && exists(p));
    if (ordered.length) return ordered;
  }
  return Object.keys(zip.files)
    .filter((p) => /^Contents\/section\d+\.xml$/.test(p))
    .sort((a, b) => sectionNo(a) - sectionNo(b));
}

const sectionNo = (path: string) => Number(/section(\d+)\.xml$/.exec(path)?.[1] ?? 0);

/** 구역 XML 하나에서 글자를 꺼낸다 */
function sectionText(xml: string): string {
  // 태그 또는 글자 덩어리를 하나씩 읽는다. 접두사(hp:)와 상관없이 이름만 본다.
  const TOKEN = /<(\/?)(?:[\w-]+:)?([\w-]+)\b[^>]*?(\/?)>|([^<]+)/g;
  let out = "";
  let inText = 0; // <t> 안에 있는지
  let cellDepth = 0; // 표 칸 안에 있는지

  for (const [, closing, name, selfClosing, text] of xml.matchAll(TOKEN)) {
    if (text !== undefined) {
      if (inText > 0) out += decodeXml(text);
      continue;
    }
    const open = !closing && !selfClosing;
    switch (name) {
      case "t":
        if (open) inText++;
        else if (closing) inText = Math.max(0, inText - 1);
        break;
      case "tab":
        out += " ";
        break;
      case "lineBreak":
        out += cellDepth > 0 ? " " : "\n";
        break;
      case "p":
        if (closing) out += cellDepth > 0 ? " " : "\n";
        break;
      case "tc":
        if (open) cellDepth++;
        if (closing) {
          cellDepth = Math.max(0, cellDepth - 1);
          out += "\u0000"; // 칸 구분 표시 (아래에서 " | "로 바꾼다)
        }
        break;
      case "tr":
        if (closing) out += "\n";
        break;
    }
  }

  return out
    .split("\n")
    .map((line) =>
      line
        .split("\u0000")
        .map((cell) => cell.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

/** XML 특수문자(&lt; &amp; &#44032; 등)를 원래 글자로 */
function decodeXml(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_m, e: string) => {
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "amp") return "&";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}
