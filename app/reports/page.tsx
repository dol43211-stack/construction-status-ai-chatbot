// ⑥ 보고서 목록 (DESIGN.md 3.3) — PLAN 23번
// 탭: 확정 보고서(기본) / 작성 중인 초안. 거르기: 공사, 주간·월간, 연·월
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ReportFilter } from "@/components/reports/report-filter";
import { ReportList } from "@/components/reports/report-list";
import { listProjects } from "@/lib/data/projects";
import { countDrafts, listReports } from "@/lib/data/reports";

export const metadata: Metadata = { title: "보고서" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await connection(); // 화면을 열 때마다 최신 목록을 읽는다
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const tab = params.tab === "draft" ? "draft" : "confirmed";
  const type = params.type === "weekly" || params.type === "monthly" ? params.type : undefined;

  const [projects, reports, draftCount] = await Promise.all([
    listProjects(),
    listReports({ status: tab, projectId: one(params.project), periodType: type, yearMonth: one(params.month) }),
    countDrafts(),
  ]);

  const tabLink = (t: "confirmed" | "draft") => {
    const next = new URLSearchParams();
    for (const key of ["project", "type", "month"]) {
      const v = one(params[key]);
      if (v) next.set(key, v);
    }
    if (t === "draft") next.set("tab", "draft");
    return next.size ? `/reports?${next}` : "/reports";
  };

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

      <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
        {(["confirmed", "draft"] as const).map((t) => (
          <Link
            key={t}
            href={tabLink(t)}
            role="tab"
            aria-selected={tab === t}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "confirmed" ? "확정 보고서" : `작성 중인 초안 ${draftCount}`}
          </Link>
        ))}
      </div>

      <div className="mb-4">
        <Suspense>
          <ReportFilter projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </Suspense>
      </div>

      <ReportList
        reports={reports}
        empty={tab === "confirmed" ? "조건에 맞는 확정 보고서가 없습니다." : "작성 중인 초안이 없습니다."}
      />
    </>
  );
}
