// ⑥ 확정 보고서 목록 (DESIGN.md 3.3) — 화면 뼈대
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "보고서" };

export default function ReportsPage() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="보고서" description="확정된 주간·월간 보고서를 찾아보고 내려받아요." />
        <Link
          href="/reports/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          새 보고서 만들기
        </Link>
      </div>
      <ComingSoon
        items={[
          "거르기 (공사, 주간/월간, 연·월)",
          "확정 보고서 목록 (공사명 · 기간 · 확정일)",
          "작성 중인 초안 탭",
        ]}
      />
    </>
  );
}
