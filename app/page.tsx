// ① 홈 (DESIGN.md 3.3)
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">무엇을 도와드릴까요?</h1>
      <p className="mt-1 text-slate-600">공사 현황을 묻거나, 주간·월간 보고서 초안을 만들 수 있어요.</p>

      {/* 큰 버튼 2개 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/chat"
          className="rounded-xl bg-blue-600 p-5 text-white shadow-sm hover:bg-blue-700"
        >
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <p className="mt-2 text-lg font-semibold">챗봇에게 묻기</p>
          <p className="text-sm text-blue-100">예: &ldquo;한빛청사 이번 달 공정률은?&rdquo;</p>
        </Link>
        <Link
          href="/reports/new"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <span className="text-2xl" aria-hidden>
            📊
          </span>
          <p className="mt-2 text-lg font-semibold">새 보고서 만들기</p>
          <p className="text-sm text-slate-500">공사와 기간을 고르면 AI가 초안을 써요</p>
        </Link>
      </div>

      {/* 최근 확정 보고서 5개 (PLAN 23번에서 실제 목록으로 바꾼다) */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">최근 확정 보고서</h2>
        <p className="mt-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          아직 확정된 보고서가 없습니다.
        </p>
      </section>
    </div>
  );
}
