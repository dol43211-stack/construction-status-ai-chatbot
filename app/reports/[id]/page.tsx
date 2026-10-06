// ⑦ 확정 보고서 보기 (DESIGN.md 3.3) — PLAN 22번 (내려받기 버튼은 PLAN 24~25번)
// 휴대폰에서도 읽기 편하도록 9개 항목을 세로로 읽기 전용으로 보여준다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getReport } from "@/lib/data/reports";
import { NO_DATA } from "@/lib/reports/items";
import { formatPeriod } from "@/lib/reports/period";

export const metadata: Metadata = { title: "보고서 보기" };

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  await connection();
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  if (report.status === "draft") redirect(`/reports/${id}/edit`); // 초안은 검토 화면에서

  const confirmedAt = report.confirmedAt
    ? new Date(report.confirmedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          <Link href="/reports" className="hover:underline">
            보고서
          </Link>{" "}
          › 보고서 보기
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{report.projectName}</h1>
        <p className="mt-1 text-slate-600">
          {report.periodType === "weekly" ? "주간" : "월간"} · {formatPeriod({ start: report.periodStart, end: report.periodEnd })}
          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">✅ 확정</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">확정일 {confirmedAt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400">
            엑셀 내려받기 (준비 중)
          </span>
          <span className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400">
            한글 내려받기 (준비 중)
          </span>
        </div>
      </div>

      <ol className="space-y-3">
        {report.items.map((item, n) => (
          <li key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">
              {n + 1}. {item.title}
              {item.needsCheck && (
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                  🔶 확인 필요 상태로 확정됨
                </span>
              )}
            </h2>
            <p
              className={`mt-2 whitespace-pre-line text-[15px] leading-7 ${item.content === NO_DATA ? "text-slate-400" : "text-slate-800"}`}
            >
              {item.content}
            </p>
            {item.sources.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">📎 근거: {item.sources.map((s) => s.fileName).join(", ")}</p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
