"use client";
// 문서 표 (DESIGN.md 3.3 ③) — PLAN 18번
// 파일명 · 공사 · 문서 종류 · 작성일 · 대상 기간 · 확인 여부
// - AI가 읽은 정보는 노란 "확인 필요" → 직원이 확인하면 초록 "확인됨"
// - 네 칸이 다 채워져 있으면 [이대로 확인] 한 번으로 끝낼 수 있고, 틀리면 [수정]해서 확인한다.
// PC와 휴대폰 모두에서 읽기 쉽도록 표 대신 카드 목록으로 보여준다.
import { startTransition, useActionState, useState } from "react";
import { confirmDocument } from "@/lib/actions/documents";
import type { ActionState } from "@/lib/actions/projects";
import type { DocumentRow } from "@/lib/data/documents";
import { DOC_KINDS } from "@/lib/documents/document-info";
import { ResultMessage } from "@/components/projects/result-message";

type Project = { id: string; name: string };

export function DocumentList({ documents, projects }: { documents: DocumentRow[]; projects: Project[] }) {
  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        조건에 맞는 문서가 없습니다.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {documents.map((d) => (
        <DocumentItem key={d.id} doc={d} projects={projects} />
      ))}
    </ul>
  );
}

const period = (d: DocumentRow) =>
  d.periodStart && d.periodEnd ? (d.periodStart === d.periodEnd ? d.periodStart : `${d.periodStart} ~ ${d.periodEnd}`) : null;

function DocumentItem({ doc, projects }: { doc: DocumentRow; projects: Project[] }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await confirmDocument(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  const complete = !!(doc.projectId && doc.docKind && doc.writtenDate && doc.periodStart && doc.periodEnd);
  const fields: [string, string | null][] = [
    ["공사", doc.projectName],
    ["문서 종류", doc.docKind],
    ["작성일", doc.writtenDate],
    ["대상 기간", period(doc)],
  ];

  return (
    <li
      className={`rounded-xl border bg-white p-4 ${doc.confirmed ? "border-slate-200" : "border-amber-300 bg-amber-50/40"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-all font-semibold text-slate-900">
          <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium uppercase text-slate-600">
            {doc.fileType}
          </span>
          {doc.fileName}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            doc.confirmed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {doc.confirmed ? "✅ 확인됨" : "🟡 확인 필요"}
        </span>
      </div>

      {editing ? (
        <form
          // form action으로 바로 보내면 처리 후 입력칸이 자동으로 비워진다.
          // 오류가 났을 때 입력한 값이 사라지지 않도록 직접 보낸다.
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => action(formData));
          }}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={doc.id} />
          <Field label="공사">
            <select name="projectId" defaultValue={doc.projectId ?? ""} required className={inputClass}>
              <option value="">— 공사를 고르세요 —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="문서 종류">
            <select name="docKind" defaultValue={doc.docKind ?? ""} required className={inputClass}>
              <option value="">— 종류를 고르세요 —</option>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="작성일">
            <input type="date" name="writtenDate" defaultValue={doc.writtenDate ?? ""} required className={inputClass} />
          </Field>
          <Field label="대상 기간">
            <div className="flex items-center gap-1.5">
              <input type="date" name="periodStart" defaultValue={doc.periodStart ?? ""} required aria-label="대상 기간 시작일" className={inputClass} />
              <span aria-hidden>~</span>
              <input type="date" name="periodEnd" defaultValue={doc.periodEnd ?? ""} required aria-label="대상 기간 끝일" className={inputClass} />
            </div>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {pending ? "저장 중…" : "확인하고 저장"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              취소
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            {fields.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className={value ? "text-slate-900" : "font-medium text-amber-700"}>{value ?? "비어 있음"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {!doc.confirmed && complete && (
              <form action={action}>
                {/* 화면에 보이는 값 그대로 확인 */}
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="projectId" value={doc.projectId ?? ""} />
                <input type="hidden" name="docKind" value={doc.docKind ?? ""} />
                <input type="hidden" name="writtenDate" value={doc.writtenDate ?? ""} />
                <input type="hidden" name="periodStart" value={doc.periodStart ?? ""} />
                <input type="hidden" name="periodEnd" value={doc.periodEnd ?? ""} />
                <button type="submit" disabled={pending} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                  {pending ? "확인 중…" : "이대로 확인"}
                </button>
              </form>
            )}
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              {doc.confirmed ? "정보 수정" : complete ? "고쳐서 확인" : "직접 입력해서 확인"}
            </button>
          </div>
        </>
      )}
      <ResultMessage state={state} />
    </li>
  );
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
