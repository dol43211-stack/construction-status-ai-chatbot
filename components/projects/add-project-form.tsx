"use client";
// 공사명 입력칸 + [추가] 버튼 (DESIGN.md 3.3 ②)
import { useActionState } from "react";
import { createProject, type ActionState } from "@/lib/actions/projects";
import { ResultMessage } from "./result-message";

export function AddProjectForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProject, null);

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4">
      <label htmlFor="new-project-name" className="text-sm font-semibold text-slate-700">
        새 공사 등록
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="new-project-name"
          name="name"
          required
          maxLength={100}
          placeholder="예: 한빛청사 신축공사"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "추가 중…" : "추가"}
        </button>
      </div>
      <ResultMessage state={state} />
    </form>
  );
}
