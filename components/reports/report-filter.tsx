"use client";
// 보고서 목록 거르기: 공사, 주간/월간, 연·월 (DESIGN.md 3.3 ⑥, 설계 검토 m-3) — PLAN 23번
// 조건은 주소(?project=…&type=…&month=…)에 담아 새로고침해도 유지된다. 탭(?tab=)은 그대로 둔다.
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ReportFilter({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function change(key: "project" | "type" | "month", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const hasFilter = params.has("project") || params.has("type") || params.has("month");
  const select = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select aria-label="공사로 거르기" value={params.get("project") ?? ""} onChange={(e) => change("project", e.target.value)} className={select}>
        <option value="">모든 공사</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select aria-label="주간·월간으로 거르기" value={params.get("type") ?? ""} onChange={(e) => change("type", e.target.value)} className={select}>
        <option value="">주간·월간 모두</option>
        <option value="monthly">월간</option>
        <option value="weekly">주간</option>
      </select>
      <input
        type="month"
        aria-label="연·월로 거르기"
        value={params.get("month") ?? ""}
        onChange={(e) => change("month", e.target.value)}
        className={select}
      />
      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams();
            if (params.get("tab")) next.set("tab", params.get("tab")!);
            router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
          }}
          className="rounded-lg px-2 py-1.5 text-slate-500 underline hover:text-slate-800"
        >
          거르기 해제
        </button>
      )}
    </div>
  );
}
