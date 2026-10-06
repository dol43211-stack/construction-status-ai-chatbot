// ④ 새 보고서 만들기 (DESIGN.md 3.3) — PLAN 19번: 조건 고르기 + 해당 문서 미리보기
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { NewReportForm } from "@/components/reports/new-report-form";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "새 보고서 만들기" };

/** 한국 시간 기준 오늘 날짜 "YYYY-MM-DD" */
function todayInKorea(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 월간 기본값: 지난달 (월간 보고서는 보통 지난달 것을 쓴다) */
function previousMonth(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export default async function NewReportPage() {
  await connection(); // 오늘 날짜와 최신 공사 목록을 화면을 열 때마다 읽는다
  const projects = await listProjects();
  const today = todayInKorea();

  return (
    <>
      <PageHeader title="새 보고서 만들기" description="공사와 기간을 고르면 AI가 9개 항목 초안을 써요." />
      {projects.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          등록된 공사가 없습니다.{" "}
          <Link href="/projects" className="font-semibold text-blue-700 underline">
            공사 목록
          </Link>
          에서 먼저 공사를 등록해주세요.
        </p>
      ) : (
        <NewReportForm
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          defaultWeekDate={today}
          defaultMonth={previousMonth(today)}
        />
      )}
    </>
  );
}
