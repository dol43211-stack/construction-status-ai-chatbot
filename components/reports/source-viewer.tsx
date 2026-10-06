"use client";
// 근거 문서 글자 보기 (DESIGN.md 3.3 ⑤ "근거 문서 이름표 → 해당 문서 글자 보기") — PLAN 21번
// 초안 항목에 나온 숫자를 원문에서 노란색으로 표시해, 직원이 바로 대조할 수 있게 한다.
// 보여주는 글자는 개인정보를 가린 본문이다.
import { useEffect, useState } from "react";
import { getDocumentText, type DocumentTextResult } from "@/lib/actions/reports";
import { highlight, numbersIn } from "@/lib/reports/highlight";

export function SourceViewer({
  documentId,
  itemTitle,
  itemContent,
  onClose,
}: {
  documentId: string;
  itemTitle: string;
  itemContent: string;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<DocumentTextResult | null>(null);

  useEffect(() => {
    let alive = true;
    getDocumentText(documentId).then((r) => alive && setDoc(r));
    return () => {
      alive = false;
    };
  }, [documentId]);

  // Esc 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const numbers = numbersIn(itemContent);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="근거 문서 보기"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-xl md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">근거 문서 · {itemTitle} 대조</p>
            <p className="break-all font-semibold text-slate-900">{doc?.ok ? doc.fileName : "불러오는 중…"}</p>
            {numbers.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                초안의 숫자를 <mark className="rounded bg-yellow-200 px-0.5">노란색</mark>으로 표시했어요.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {!doc ? (
            <p className="text-sm text-slate-500">문서를 불러오는 중…</p>
          ) : !doc.ok ? (
            <p className="text-sm text-red-600">⚠️ {doc.message}</p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
              {highlight(doc.text, numbers).map((s, i) =>
                s.hit ? (
                  <mark key={i} className="rounded bg-yellow-200 px-0.5">
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
