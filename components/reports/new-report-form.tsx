"use client";
// ④ 새 보고서 만들기 (DESIGN.md 3.3) — PLAN 19번: 조건 고르기 + 해당 문서 미리보기
// 1단계 공사 → 2단계 주간(월~일)·월간(1일~말일) → 3단계 이 기간의 문서 N건 미리보기
// 조건을 바꿀 때마다 서버에 물어 목록을 바로 다시 보여준다.
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { previewReportDocuments, type PreviewResult } from "@/lib/actions/reports";
import { formatPeriod, type PeriodType } from "@/lib/reports/period";

type Project = { id: string; name: string };

export function NewReportForm({
  projects,
  defaultWeekDate,
  defaultMonth,
}: {
  projects: Project[];
  defaultWeekDate: string;
  defaultMonth: string;
}) {
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<PeriodType>("monthly");
  const [weekDate, setWeekDate] = useState(defaultWeekDate);
  const [month, setMonth] = useState(defaultMonth);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, startLoading] = useTransition();
  const latest = useRef(0); // 조건을 빠르게 바꿀 때 늦게 온 옛 결과가 덮어쓰지 않게

  const value = type === "weekly" ? weekDate : month;

  useEffect(() => {
    if (!projectId || !value) return;
    const ticket = ++latest.current;
    startLoading(async () => {
      const result = await previewReportDocuments(projectId, type, value);
      if (ticket === latest.current) setPreview(result);
    });
  }, [projectId, type, value]);

  const shown = projectId ? preview : null;
  const canGenerate = !loading && shown?.ok === true && shown.documents.length > 0;

  return (
    <div className="space-y-4">
      {/* 1단계: 공사 */}
      <Step no={1} title="공사 고르기">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="공사"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">— 공사를 고르세요 —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Step>

      {/* 2단계: 주간·월간과 기간 */}
      <Step no={2} title="기간 고르기">
        <div className="flex gap-2" role="radiogroup" aria-label="보고서 종류">
          {(["monthly", "weekly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                type === t ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {t === "monthly" ? "월간" : "주간"}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {type === "weekly" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">그 주에 속한 날짜 하나를 고르세요 (월~일로 자동 계산)</span>
              <input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </label>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">연·월을 고르세요 (1일~말일)</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </label>
          )}
        </div>
        {shown?.ok && (
          <p className="mt-2 text-sm font-semibold text-blue-700">보고 기간: {formatPeriod(shown.period)}</p>
        )}
      </Step>

      {/* 3단계: 해당 문서 미리보기 */}
      <Step no={3} title="이 기간에 해당하는 문서">
        {!projectId ? (
          <p className="text-sm text-slate-500">공사를 고르면 해당 문서가 보여요.</p>
        ) : loading && !shown ? (
          <p className="text-sm text-slate-500">문서를 찾는 중…</p>
        ) : shown && !shown.ok ? (
          <p className="text-sm text-red-600">⚠️ {shown.message}</p>
        ) : shown?.ok ? (
          <div className={loading ? "opacity-50" : ""} aria-busy={loading}>
            {shown.documents.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
                ⚠️ 선택한 기간에 해당하는 문서가 없습니다.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-800">문서 {shown.documents.length}건</p>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {shown.documents.map((d) => (
                    <li key={d.id} className="py-2">
                      <p className="break-all text-slate-900">{d.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {d.docKind} · 대상 기간 {formatPeriod(d.period)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {shown.pendingCount > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                🟡 이 기간에 아직 확인하지 않은 문서가 {shown.pendingCount}건 있어요. 확인해야 보고서에 쓰여요.{" "}
                <Link href="/documents?pending=1" className="font-semibold underline">
                  문서 확인하러 가기
                </Link>
              </p>
            )}
          </div>
        ) : null}
      </Step>

      <button
        type="button"
        disabled={!canGenerate}
        title="초안 만들기는 다음 작업(PLAN 20번)에서 연결됩니다"
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        초안 만들기 (준비 중)
      </button>
    </div>
  );
}

function Step({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-slate-800">
        <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-700">
          {no}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
