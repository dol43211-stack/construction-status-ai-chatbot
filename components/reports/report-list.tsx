// 보고서 목록 카드 (DESIGN.md 3.3 ⑥ 목록, ① 홈 "최근 확정 보고서") — PLAN 23번
// 확정본을 누르면 보기 화면, 초안을 누르면 검토 화면으로 간다.
import Link from "next/link";
import type { ReportSummary } from "@/lib/data/reports";
import { formatPeriod } from "@/lib/reports/period";

const time = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

export function ReportList({ reports, empty }: { reports: ReportSummary[]; empty: string }) {
  if (reports.length === 0) {
    return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            href={r.status === "confirmed" ? `/reports/${r.id}` : `/reports/${r.id}/edit`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-4 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{r.projectName}</p>
              <p className="text-sm text-slate-600">
                <span
                  className={`mr-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
                    r.periodType === "weekly" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {r.periodType === "weekly" ? "주간" : "월간"}
                </span>
                {formatPeriod({ start: r.periodStart, end: r.periodEnd })}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {r.status === "confirmed" ? (
                <>확정 {r.confirmedAt ? time(r.confirmedAt) : ""}</>
              ) : (
                <>
                  {r.checkCount > 0 && (
                    <span className="mr-2 rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-800">
                      🔶 확인 필요 {r.checkCount}
                    </span>
                  )}
                  수정 {time(r.updatedAt)}
                </>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
