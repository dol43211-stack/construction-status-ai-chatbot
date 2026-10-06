// 앱 정보 (PWA 웹 앱 매니페스트) — PLAN 28번, PRD 6장 "휴대폰 화면 지원 + 홈 화면에 추가"
// 휴대폰에서 "홈 화면에 추가"를 누르면 이 정보로 앱 아이콘이 생기고, 주소창 없이 앱처럼 열린다.
// 아이콘은 scripts/generate-icons.mjs로 만든다.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "공사관리 현황 AI챗봇",
    short_name: "공사 AI", // 홈 화면 아이콘 아래 짧은 이름
    description: "서울지방조달청 공사관리과 건설공사 진행현황 보고서 작성·질의응답 도우미",
    lang: "ko",
    // 휴대폰에서는 주로 질문하기를 쓰므로 챗봇 화면에서 시작한다 (PRD 6장)
    start_url: "/chat",
    scope: "/",
    display: "standalone", // 주소창 없이 앱처럼
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
