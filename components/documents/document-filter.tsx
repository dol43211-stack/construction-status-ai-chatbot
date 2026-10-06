"use client";
// 문서 표 거르기: 공사별, 확인 필요만 보기 (DESIGN.md 3.3 ③)
// 거르기 조건은 주소(?project=…&pending=1)에 담아서, 새로고침해도 유지되게 한다.
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DocumentFilter({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function change(key: "project" | "pending", value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <select
        aria-label="공사로 거르기"
        value={params.get("project") ?? ""}
        onChange={(e) => change("project", e.target.value || null)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
      >
        <option value="">모든 공사</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={params.get("pending") === "1"}
          onChange={(e) => change("pending", e.target.checked ? "1" : null)}
          className="size-4"
        />
        확인 필요만 보기
      </label>
    </div>
  );
}
