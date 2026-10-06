"use client";
// 메뉴 (DESIGN.md 3.1 공통 틀)
// - PC: 왼쪽 세로 메뉴 / 휴대폰: 아래쪽 탭 메뉴
// - 지금 보고 있는 화면의 메뉴를 강조하려면 현재 주소가 필요해서 브라우저 쪽 컴포넌트로 만든다.
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/projects", label: "공사", icon: "🏗️" },
  { href: "/documents", label: "문서", icon: "📄" },
  { href: "/reports", label: "보고서", icon: "📊" },
  { href: "/chat", label: "챗봇", icon: "💬" },
] as const;

/** 현재 주소가 이 메뉴(또는 그 아래 화면)인지 */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** PC용 왼쪽 세로 메뉴 */
export function SideNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-slate-200 bg-white md:flex"
    >
      <Link href="/" className="px-5 py-6 text-lg font-bold leading-snug text-slate-900">
        공사관리 현황
        <br />
        AI챗봇
      </Link>
      <ul className="flex flex-col gap-1 px-3">
        {MENU.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              aria-current={isActive(m.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] ${
                isActive(m.href)
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span aria-hidden>{m.icon}</span>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 휴대폰용 아래쪽 탭 메뉴 */
export function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {MENU.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              aria-current={isActive(m.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive(m.href) ? "font-semibold text-blue-700" : "text-slate-500"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">
                {m.icon}
              </span>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
