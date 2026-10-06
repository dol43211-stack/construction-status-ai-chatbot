// ⑤ 초안 검토·수정 (DESIGN.md 3.3) — PLAN 20번 초안 보기, 21번 고치기·임시 저장
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReportEditor } from "@/components/reports/report-editor";
import { getReport } from "@/lib/data/reports";
import { formatPeriod } from "@/lib/reports/period";

export const metadata: Metadata = { title: "초안 검토" };

export default async function EditReportPage({ params }: PageProps<"/reports/[id]/edit">) {
  await connection();
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-slate-500">
          <Link href="/reports" className="hover:underline">
            보고서
          </Link>{" "}
          › 초안 검토
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{report.projectName}</h1>
        <p className="mt-1 text-slate-600">
          {report.periodType === "weekly" ? "주간" : "월간"} · {formatPeriod({ start: report.periodStart, end: report.periodEnd })}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {report.status === "draft" ? "초안" : "확정"}
          </span>
        </p>
      </div>

      {report.status === "draft" ? (
        // key: 다른 보고서로 옮겨 가면 수정 중이던 상태를 새로 시작한다
        <ReportEditor key={report.id} reportId={report.id} items={report.items} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          확정된 보고서는 고칠 수 없습니다.{" "}
          <Link href={`/reports/${report.id}`} className="font-semibold text-blue-700 underline">
            확정 보고서 보기
          </Link>
        </p>
      )}
    </>
  );
}
