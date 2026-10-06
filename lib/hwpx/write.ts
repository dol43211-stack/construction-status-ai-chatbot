// 한글(.hwpx) 만들기 — 코드로 처음부터 (DESIGN.md 7.2) — PLAN 25번
// .hwpx는 압축(zip) 파일이고, 안에 아래 파일들이 들어간다. (OWPML 표준)
//   mimetype                 맨 앞, 압축하지 않음 ("application/hwp+zip")
//   version.xml              파일 형식 버전
//   settings.xml             커서 위치 등 프로그램 설정
//   META-INF/container.xml   목차 파일(content.hpf)의 위치
//   META-INF/manifest.xml    (암호 정보 등, 여기서는 비어 있음)
//   Contents/content.hpf     들어 있는 파일 목록과 순서
//   Contents/header.xml      글꼴·글자 모양·문단 모양·테두리 정의
//   Contents/section0.xml    본문 (문단과 표)
// 비밀 값을 다루지 않으므로 서버·시험 어디서든 불러올 수 있다.
import JSZip from "jszip";

/** 본문 블록: 문단 또는 표 */
export type HwpxBlock =
  | { type: "paragraph"; text: string; style?: TextStyle; align?: "left" | "center" }
  | { type: "table"; columns: { title: string; width: number }[]; rows: HwpxCell[][] }
  | { type: "fields"; rows: [string, string][] };

export type HwpxCell = { text: string; style?: TextStyle; align?: "left" | "center" };

/** 글자 모양: 보통 / 제목 / 굵게 / 강조(주황 굵게) */
export type TextStyle = "normal" | "title" | "bold" | "alert";

const CHAR_PR: Record<TextStyle, number> = { normal: 0, title: 1, bold: 2, alert: 3 };
const PARA_LEFT = 0;
const PARA_CENTER = 1;
const BORDER_NONE = 1;
const BORDER_CELL = 2;
const BORDER_HEAD = 3;

/** A4 세로, 여백 좌우 30mm·위 20mm·아래 15mm (단위: HWPUNIT, 1mm ≈ 283.46) */
const PAGE = { width: 59528, height: 84186, left: 8504, right: 8504, top: 5668, bottom: 4252, header: 4252, footer: 4252 };
/** 본문 너비 */
export const TEXT_WIDTH = PAGE.width - PAGE.left - PAGE.right; // 42520

const NS = [
  'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"',
  'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"',
  'xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"',
  'xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"',
  'xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"',
  'xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"',
  'xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history"',
  'xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page"',
  'xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:opf="http://www.idpf.org/2007/opf/"',
  'xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart"',
  'xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar"',
  'xmlns:epub="http://www.idpf.org/2007/ops"',
  'xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"',
].join(" ");

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';

/** XML 특수문자 바꾸기. XML에 쓸 수 없는 제어 문자는 뺀다. */
export const escapeXml = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ─────────────── header.xml (글꼴·모양 정의) ───────────────

const LANGS = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"];
/** 7개 언어 칸에 같은 값을 넣는다: hangul="0" latin="0" … */
const perLang = (value: string) => LANGS.map((l) => `${l.toLowerCase()}="${value}"`).join(" ");

function fontfaces(): string {
  const faces = LANGS.map(
    (lang) =>
      `<hh:fontface lang="${lang}" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font></hh:fontface>`,
  ).join("");
  return `<hh:fontfaces itemCnt="${LANGS.length}">${faces}</hh:fontfaces>`;
}

function borderFill(id: number, line: "NONE" | "SOLID", fill?: string): string {
  const side = (name: string) => `<hh:${name} type="${line}" width="0.12 mm" color="#000000"/>`;
  const brush = fill
    ? `<hc:fillBrush><hc:winBrush faceColor="${fill}" hatchColor="#999999" alpha="0"/></hc:fillBrush>`
    : "";
  return (
    `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">` +
    `<hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>` +
    side("leftBorder") + side("rightBorder") + side("topBorder") + side("bottomBorder") +
    `<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>${brush}</hh:borderFill>`
  );
}

function charPr(id: number, height: number, opts: { bold?: boolean; color?: string } = {}): string {
  return (
    `<hh:charPr id="${id}" height="${height}" textColor="${opts.color ?? "#000000"}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="${BORDER_NONE}">` +
    `<hh:fontRef ${perLang("0")}/><hh:ratio ${perLang("100")}/><hh:spacing ${perLang("0")}/><hh:relSz ${perLang("100")}/><hh:offset ${perLang("0")}/>` +
    (opts.bold ? "<hh:bold/>" : "") +
    `<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/>` +
    `<hh:outline type="NONE"/><hh:shadow type="NONE" color="#B2B2B2" offsetX="10" offsetY="10"/></hh:charPr>`
  );
}

function paraPr(id: number, align: "JUSTIFY" | "CENTER" | "LEFT"): string {
  const zero = (name: string) => `<hc:${name} value="0" unit="HWPUNIT"/>`;
  return (
    `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">` +
    `<hh:align horizontal="${align}" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/>` +
    `<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>` +
    `<hh:autoSpacing eAsianEng="0" eAsianNum="0"/>` +
    `<hh:margin>${zero("intent")}${zero("left")}${zero("right")}${zero("prev")}${zero("next")}</hh:margin>` +
    `<hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>` +
    `<hh:border borderFillIDRef="${BORDER_NONE}" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`
  );
}

function headerXml(): string {
  return (
    `${XML_HEAD}<hh:head ${NS} version="1.4" secCnt="1">` +
    `<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>` +
    `<hh:refList>` +
    fontfaces() +
    `<hh:borderFills itemCnt="3">${borderFill(BORDER_NONE, "NONE")}${borderFill(BORDER_CELL, "SOLID")}${borderFill(BORDER_HEAD, "SOLID", "#E2E8F0")}</hh:borderFills>` +
    `<hh:charProperties itemCnt="4">${charPr(0, 1000)}${charPr(1, 1600, { bold: true })}${charPr(2, 1000, { bold: true })}${charPr(3, 1000, { bold: true, color: "#C2410C" })}</hh:charProperties>` +
    `<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>` +
    `<hh:paraProperties itemCnt="2">${paraPr(PARA_LEFT, "JUSTIFY")}${paraPr(PARA_CENTER, "CENTER")}</hh:paraProperties>` +
    `<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>` +
    `</hh:refList>` +
    `<hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>` +
    `<hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>` +
    `<hh:trackchageConfig flags="56"/>` +
    `</hh:head>`
  );
}

// ─────────────── section0.xml (본문) ───────────────

/** 첫 문단에 들어가는 구역 설정 (용지 크기·여백·단) */
function sectionSettings(): string {
  const pageBorder = (type: string) =>
    `<hp:pageBorderFill type="${type}" borderFillIDRef="${BORDER_NONE}" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>`;
  const notePr = (tag: string, place: string, length: number, between: number) =>
    `<hp:${tag}><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>` +
    `<hp:noteLine length="${length}" type="SOLID" width="0.12 mm" color="#000000"/>` +
    `<hp:noteSpacing betweenNotes="${between}" belowLine="567" aboveLine="850"/>` +
    `<hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="${place}" beneathText="0"/></hp:${tag}>`;
  return (
    `<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">` +
    `<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>` +
    `<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>` +
    `<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>` +
    `<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>` +
    `<hp:pagePr landscape="WIDELY" width="${PAGE.width}" height="${PAGE.height}" gutterType="LEFT_ONLY">` +
    `<hp:margin header="${PAGE.header}" footer="${PAGE.footer}" gutter="0" left="${PAGE.left}" right="${PAGE.right}" top="${PAGE.top}" bottom="${PAGE.bottom}"/></hp:pagePr>` +
    notePr("footNotePr", "EACH_COLUMN", -1, 283) +
    notePr("endNotePr", "END_OF_DOCUMENT", 14692344, 0) +
    pageBorder("BOTH") + pageBorder("EVEN") + pageBorder("ODD") +
    `</hp:secPr>` +
    `<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>`
  );
}

/** 본문을 만드는 동안 문단·표 번호를 매긴다 */
class Writer {
  private paraId = 0;
  private tableId = 0;

  paragraph(text: string, style: TextStyle = "normal", align: "left" | "center" = "left", lead = ""): string {
    const lines = text.split("\n");
    // 한 문단 안의 줄바꿈은 <hp:lineBreak/>로
    const body = lines.map((l, i) => (i ? "<hp:lineBreak/>" : "") + escapeXml(l)).join("");
    return (
      `<hp:p id="${this.paraId++}" paraPrIDRef="${align === "center" ? PARA_CENTER : PARA_LEFT}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      lead +
      `<hp:run charPrIDRef="${CHAR_PR[style]}"><hp:t>${body}</hp:t></hp:run></hp:p>`
    );
  }

  table(columns: { width: number }[], rows: HwpxCell[][], headerRows: number): string {
    const id = ++this.tableId;
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);
    const rowHeight = 1300;
    const cells = rows
      .map(
        (row, r) =>
          `<hp:tr>` +
          row
            .map((cell, c) => {
              const head = r < headerRows;
              const paras = cell.text
                .split("\n")
                .map((line) => this.paragraph(line, cell.style ?? (head ? "bold" : "normal"), cell.align ?? (head ? "center" : "left")))
                .join("");
              return (
                `<hp:tc name="" header="${head ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${head ? BORDER_HEAD : BORDER_CELL}">` +
                `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${head ? "CENTER" : "TOP"}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras}</hp:subList>` +
                `<hp:cellAddr colAddr="${c}" rowAddr="${r}"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
                `<hp:cellSz width="${columns[c].width}" height="${rowHeight}"/>` +
                `<hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`
              );
            })
            .join("") +
          `</hp:tr>`,
      )
      .join("");
    const tbl =
      `<hp:tbl id="${id}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length}" colCnt="${columns.length}" cellSpacing="0" borderFillIDRef="${BORDER_CELL}" noAdjust="0">` +
      `<hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${rowHeight * rows.length}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>` +
      cells +
      `</hp:tbl>`;
    return (
      `<hp:p id="${this.paraId++}" paraPrIDRef="${PARA_LEFT}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0">${tbl}<hp:t/></hp:run></hp:p>`
    );
  }
}

function sectionXml(blocks: HwpxBlock[]): string {
  const w = new Writer();
  const parts: string[] = [];
  // 첫 문단에는 구역 설정이 들어가야 한다. 첫 블록이 문단이 아니면 빈 문단을 먼저 둔다.
  const settings = `<hp:run charPrIDRef="0">${sectionSettings()}</hp:run>`;
  let settingsPlaced = false;
  for (const block of blocks) {
    if (block.type === "paragraph") {
      parts.push(w.paragraph(block.text, block.style, block.align, settingsPlaced ? "" : settings));
      settingsPlaced = true;
      continue;
    }
    if (!settingsPlaced) {
      parts.push(w.paragraph("", "normal", "left", settings));
      settingsPlaced = true;
    }
    if (block.type === "fields") {
      // 머리 정보: 2칸 표 (항목 이름 | 값)
      const label = 7000;
      parts.push(
        w.table(
          [{ width: label }, { width: TEXT_WIDTH - label }],
          block.rows.map(([k, v]) => [{ text: k, style: "bold" }, { text: v }]),
          0,
        ),
      );
    } else {
      parts.push(w.table(block.columns, [block.columns.map((c) => ({ text: c.title })), ...block.rows], 1));
    }
  }
  if (!settingsPlaced) parts.push(w.paragraph("", "normal", "left", settings));
  return `${XML_HEAD}<hs:sec ${NS}>${parts.join("")}</hs:sec>`;
}

// ─────────────── 묶어서 .hwpx 만들기 ───────────────

const VERSION_XML =
  `${XML_HEAD}<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="0" buildNumber="1" os="1" xmlVersion="1.4" application="Hancom Office Hangul" appVersion="12.0.0.0"/>`;

const SETTINGS_XML =
  `${XML_HEAD}<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`;

const CONTAINER_XML =
  `${XML_HEAD}<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>`;

const MANIFEST_XML = `${XML_HEAD}<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`;

function contentHpf(title: string): string {
  return (
    `${XML_HEAD}<opf:package ${NS} version="" unique-identifier="" id="">` +
    `<opf:metadata><opf:title>${escapeXml(title)}</opf:title><opf:language>ko</opf:language>` +
    `<opf:meta name="creator" content="text">공사관리 현황 AI챗봇</opf:meta></opf:metadata>` +
    `<opf:manifest>` +
    `<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>` +
    `<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>` +
    `<opf:item id="settings" href="settings.xml" media-type="application/xml"/>` +
    `</opf:manifest>` +
    `<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine>` +
    `</opf:package>`
  );
}

/** 블록들로 .hwpx 파일 내용을 만든다 */
export async function buildHwpx(title: string, blocks: HwpxBlock[]): Promise<Uint8Array> {
  const zip = new JSZip();
  // mimetype은 반드시 맨 앞, 압축하지 않음
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file("version.xml", VERSION_XML);
  zip.file("META-INF/container.xml", CONTAINER_XML);
  zip.file("META-INF/manifest.xml", MANIFEST_XML);
  zip.file("Contents/content.hpf", contentHpf(title));
  zip.file("Contents/header.xml", headerXml());
  zip.file("Contents/section0.xml", sectionXml(blocks));
  zip.file("settings.xml", SETTINGS_XML);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: "application/hwp+zip" });
}
