// 앱 아이콘 만들기 (PLAN 28번 PWA)
// 실행: node scripts/generate-icons.mjs
// Windows에 기본 설치된 Edge 브라우저로 HTML 그림을 찍어 PNG를 만든다. (새 도구 설치 없음)
//   public/icons/icon-192.png, icon-512.png   — 일반 아이콘 (안드로이드 홈 화면 등)
//   public/icons/maskable-512.png             — 테두리가 잘려도 되는 아이콘 (안드로이드가 원·둥근 사각형으로 자름)
//   app/apple-icon.png (180)                  — 아이폰 홈 화면
//   app/icon.png (64)                         — 브라우저 탭 아이콘
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "samples", ".build"); // 중간 파일 (커밋하지 않음)
mkdirSync(BUILD, { recursive: true });
mkdirSync(join(ROOT, "public", "icons"), { recursive: true });

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
if (!EDGE) throw new Error("Edge 브라우저를 찾을 수 없어 아이콘을 만들 수 없습니다.");

/**
 * 아이콘 그림 (파란 바탕에 흰 "공사" + "AI")
 * safe: 그림을 가운데 몇 %에 둘지 (maskable은 잘려도 되도록 60%)
 */
function iconHtml(size, { safe = 0.82, rounded = true } = {}) {
  const inner = Math.round(size * safe);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    .bg { width: ${size}px; height: ${size}px; background: #2563eb; border-radius: ${rounded ? size * 0.22 : 0}px;
          display: flex; align-items: center; justify-content: center; }
    .box { width: ${inner}px; height: ${inner}px; display: flex; flex-direction: column; align-items: center; justify-content: center;
           font-family: "Malgun Gothic", sans-serif; color: #fff; }
    .main { font-size: ${inner * 0.42}px; font-weight: 800; letter-spacing: -${inner * 0.02}px; line-height: 1; }
    .sub { margin-top: ${inner * 0.06}px; font-size: ${inner * 0.17}px; font-weight: 700; line-height: 1;
           background: #fff; color: #2563eb; border-radius: ${inner * 0.1}px; padding: ${inner * 0.03}px ${inner * 0.09}px; }
  </style></head><body><div class="bg"><div class="box"><div class="main">공사</div><div class="sub">AI</div></div></div></body></html>`;
}

/** Edge로 HTML을 찍어 PNG로 저장. Edge 실행 프로그램이 먼저 끝나므로 파일이 생길 때까지 기다린다. */
async function capture(html, size, out) {
  const htmlPath = join(BUILD, `icon-${size}.html`);
  writeFileSync(htmlPath, html);
  rmSync(out, { force: true });
  execFileSync(EDGE, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000", // 투명 바탕
    `--window-size=${size},${size}`,
    `--user-data-dir=${join(BUILD, "edge-profile")}`,
    `--screenshot=${out}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  for (let i = 0, last = -1; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (existsSync(out)) {
      const s = statSync(out).size;
      if (s > 0 && s === last) return console.log(`  - ${out.replace(ROOT, ".")} (${size}×${size})`);
      last = s;
    }
  }
  throw new Error(`아이콘을 만들지 못했습니다: ${out}`);
}

console.log("아이콘을 만듭니다.");
await capture(iconHtml(192), 192, join(ROOT, "public", "icons", "icon-192.png"));
await capture(iconHtml(512), 512, join(ROOT, "public", "icons", "icon-512.png"));
await capture(iconHtml(512, { safe: 0.6, rounded: false }), 512, join(ROOT, "public", "icons", "maskable-512.png"));
await capture(iconHtml(180, { rounded: false }), 180, join(ROOT, "app", "apple-icon.png")); // 아이폰이 알아서 둥글게 자른다
await capture(iconHtml(64), 64, join(ROOT, "app", "icon.png"));
