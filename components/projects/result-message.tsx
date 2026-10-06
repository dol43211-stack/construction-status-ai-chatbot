// 서버 작업 결과 안내 (성공은 초록, 실패는 빨강)
import type { ActionState } from "@/lib/actions/projects";

export function ResultMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`mt-2 text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>
      {state.ok ? "✅ " : "⚠️ "}
      {state.message}
    </p>
  );
}
