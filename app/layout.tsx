// 모든 화면이 공유하는 공통 틀 (DESIGN.md 3.1)
// - PC: 왼쪽 세로 메뉴 / 휴대폰: 위쪽 제목 줄 + 아래쪽 탭 메뉴
// - 맨 아래: "가상 자료만 사용" 안내 문구 (DESIGN.md 8장 보안 점검표)
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BottomNav, SideNav } from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "공사관리 현황 AI챗봇", template: "%s | 공사관리 현황 AI챗봇" },
  description: "서울지방조달청 공사관리과 건설공사 진행현황 보고서 작성·질의응답 도우미",
  // 아이폰 "홈 화면에 추가" 설정 (PLAN 28번) — 앱 정보(manifest)는 app/manifest.ts
  appleWebApp: { capable: true, title: "공사 AI", statusBarStyle: "default" },
};

/** 휴대폰 주소창·상단 막대 색 (PLAN 28번) */
export const viewport: Viewport = { themeColor: "#2563eb" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-slate-50 font-sans text-slate-900 antialiased">
        <SideNav />
        <div className="flex min-h-dvh flex-col md:ml-56">
          {/* 휴대폰에서만 보이는 위쪽 제목 줄 */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <Link href="/" className="font-bold">
              공사관리 현황 AI챗봇
            </Link>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
          <footer className="px-4 pb-24 pt-2 text-center text-xs text-slate-400 md:pb-6">
            실습용 가상 자료만 사용합니다. 실제 공사 문서를 올리지 마세요.
          </footer>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
