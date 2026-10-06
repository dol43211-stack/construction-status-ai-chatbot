"use client";
// 등록된 공사 목록 (공사명 · 연결된 문서 수 · 이름 수정 · 삭제) — DESIGN.md 3.3 ②
// PC와 휴대폰 모두에서 읽기 쉽도록 표 대신 한 줄짜리 카드 목록으로 보여준다.
import { useActionState, useState } from "react";
import { deleteProject, renameProject, type ActionState } from "@/lib/actions/projects";
import type { ProjectRow } from "@/lib/data/projects";
import { ResultMessage } from "./result-message";

export function ProjectList({ projects }: { projects: ProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        아직 등록된 공사가 없습니다. 위에서 공사명을 입력해 추가해주세요.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {projects.map((p) => (
        <ProjectItem key={p.id} project={p} />
      ))}
    </ul>
  );
}

function ProjectItem({ project }: { project: ProjectRow }) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameAction, renaming] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await renameProject(prev, formData);
      if (result?.ok) setEditing(false); // 성공하면 수정 칸을 닫는다
      return result;
    },
    null,
  );
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(deleteProject, null);

  return (
    <li className="p-4">
      {editing ? (
        <form action={renameAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={project.id} />
          <input
            name="name"
            defaultValue={project.name}
            required
            maxLength={100}
            autoFocus
            aria-label="새 공사명"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={renaming}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {renaming ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            취소
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{project.name}</p>
            <p className="text-sm text-slate-500">연결된 문서 {project.documentCount}건</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              이름 수정
            </button>
            <form
              action={deleteAction}
              onSubmit={(e) => {
                if (!confirm(`"${project.name}"을(를) 삭제할까요?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={project.id} />
              <button
                type="submit"
                disabled={deleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </form>
          </div>
        </div>
      )}
      <ResultMessage state={editing ? renameState : (deleteState ?? renameState)} />
    </li>
  );
}
