// ⑤ 초안 검토 (DESIGN.md 3.3) — PLAN 20번: AI가 만든 초안 보기 (수정·확정은 PLAN 21~22번)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ComingSoon } from "@/components/page-header";
import { getReport } from "@/lib/data/reports";
import { NO_DATA } from "@/lib/reports/items";
import { formatPeriod } from "@/lib/reports/period";

export const metadata: Metadata = { title: "초안 검토" };

export default async function EditReportPage({ params }: PageProps<"/reports/[id]/edit">) {
  await connection();
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  const checkCount = report.items.filter((i) => i.needsCheck).length;

  return (
    <>
      <div className="mb-6">
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
        {checkCount > 0 && (
          <p className="mt-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
            🔶 확인이 필요한 항목이 <strong>{checkCount}개</strong> 있어요. 근거 문서와 대조해 주세요.
          </p>
        )}
      </div>

      <ol className="space-y-3">
        {report.items.map((item, n) => {
          const empty = item.content === NO_DATA;
          return (
            <li
              key={item.key}
              className={`rounded-xl border bg-white p-4 ${
                item.needsCheck ? "border-orange-300 ring-1 ring-orange-200" : empty ? "border-slate-200 bg-slate-50" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">
                  {n + 1}. {item.title}
                </h2>
                {item.needsCheck && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                    🔶 확인 필요
                  </span>
                )}
              </div>
              <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${empty ? "text-slate-400" : "text-slate-800"}`}>
                {item.content}
              </p>
              {item.sources.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.sources.map((s) => (
                    <li key={s.documentId} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                      📎 {s.fileName}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        <ComingSoon items={["항목별 내용 고치기와 근거 문서 글자 보기 (PLAN 21번)", "[임시 저장] [확정하기] (PLAN 22번)"]} />
      </div>
    </>
  );
}
