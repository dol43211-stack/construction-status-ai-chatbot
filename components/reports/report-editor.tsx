"use client";
// ⑤ 초안 검토·수정 (DESIGN.md 3.3) — PLAN 21번
// - 9개 항목 카드: 내용 고치기, "확인 필요" 표시 끄기, 📎 근거 문서 글자 보기
// - 아래 고정 줄: [임시 저장] [확정하기] (확정은 PLAN 22번)
// - 저장하지 않고 화면을 떠나려 하면 브라우저가 한 번 물어본다
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { confirmReport, saveReportDraft } from "@/lib/actions/reports";
import { MAX_ITEM_CHARS, type ItemEdit } from "@/lib/reports/edit";
import { NO_DATA, type ReportItem } from "@/lib/reports/items";
import { SourceViewer } from "./source-viewer";

type Viewing = { documentId: string; itemKey: string } | null;

export function ReportEditor({ reportId, items: initial }: { reportId: string; items: ReportItem[] }) {
  const [saved, setSaved] = useState<ItemEdit[]>(() => initial.map(toEdit));
  const [edits, setEdits] = useState<ItemEdit[]>(saved);
  const [viewing, setViewing] = useState<Viewing>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  const dirty = edits.some((e, i) => e.content !== saved[i].content || e.needsCheck !== saved[i].needsCheck);
  const checkCount = edits.filter((e) => e.needsCheck).length;

  // 저장하지 않은 변경이 있으면 화면을 떠나기 전에 묻는다
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (key: string, patch: Partial<ItemEdit>) =>
    setEdits((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  function save() {
    setMessage(null);
    startSaving(async () => {
      const result = await saveReportDraft(reportId, edits);
      if (result.ok) {
        // 서버가 다듬은 값(빈칸→자료 없음, 개인정보 가림)을 화면에 그대로 보여준다
        const stored = result.items.map(toEdit);
        setSaved(stored);
        setEdits(stored);
        const time = new Date(result.savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        setMessage({ ok: true, text: `임시 저장했어요 (${time})` });
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  /**
   * [확정하기] — PLAN 22번
   * 확인 필요 항목이 남아 있으면 개수를 알려주고 한 번 더 묻는다. (최종 판단은 직원)
   * 화면에서 고친 내용은 저장하지 않았더라도 함께 저장하며 확정한다.
   */
  function confirm() {
    const question =
      checkCount > 0
        ? `확인 필요 항목이 ${checkCount}개 남아 있어요.\n그래도 확정할까요? 확정하면 더 이상 고칠 수 없어요.`
        : "보고서를 확정할까요? 확정하면 더 이상 고칠 수 없어요.";
    if (!window.confirm(question)) return;

    setMessage(null);
    startSaving(async () => {
      const result = await confirmReport(reportId, edits);
      if (result.ok) {
        setSaved(edits); // 화면을 떠날 때 "저장 안 한 변경" 경고가 뜨지 않게
        router.push(`/reports/${reportId}`);
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  const viewingItem = viewing && initial.find((i) => i.key === viewing.itemKey);

  return (
    <>
      {checkCount > 0 && (
        <p className="mb-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
          🔶 확인이 필요한 항목이 <strong>{checkCount}개</strong> 있어요. 📎 근거 문서를 열어 대조한 뒤 고치고, &ldquo;확인 완료&rdquo;에 체크해 주세요.
        </p>
      )}

      <ol className="space-y-3 pb-28 md:pb-20">
        {initial.map((item, n) => {
          const edit = edits[n];
          const empty = edit.content.trim() === "" || edit.content === NO_DATA;
          return (
            <li
              key={item.key}
              className={`rounded-xl border bg-white p-4 ${
                edit.needsCheck ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`item-${item.key}`} className="font-semibold text-slate-900">
                  {n + 1}. {item.title}
                </label>
                <label
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    edit.needsCheck ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!edit.needsCheck}
                    onChange={(e) => change(item.key, { needsCheck: !e.target.checked })}
                    className="size-3.5"
                  />
                  {edit.needsCheck ? "🔶 확인 필요" : "확인 완료"}
                </label>
              </div>
              <textarea
                id={`item-${item.key}`}
                value={edit.content}
                onChange={(e) => change(item.key, { content: e.target.value })}
                maxLength={MAX_ITEM_CHARS}
                rows={Math.min(10, Math.max(2, Math.ceil(edit.content.length / 45)))}
                className={`mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:outline-none ${
                  empty ? "text-slate-400" : "text-slate-800"
                }`}
              />
              {item.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.sources.map((s) => (
                    <button
                      key={s.documentId}
                      type="button"
                      onClick={() => setViewing({ documentId: s.documentId, itemKey: item.key })}
                      className="rounded bg-blue-50 px-2 py-0.5 text-left text-xs text-blue-800 hover:bg-blue-100"
                    >
                      📎 {s.fileName}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* 아래 고정 줄 (휴대폰에서는 아래 메뉴 위에) */}
      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className={`text-sm ${message && !message.ok ? "text-red-600" : "text-slate-600"}`} role="status">
            {message ? `${message.ok ? "✅" : "⚠️"} ${message.text}` : dirty ? "저장하지 않은 변경이 있어요." : "고칠 내용이 있으면 고친 뒤 저장하세요."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              {saving ? "저장 중…" : "임시 저장"}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "처리 중…" : "확정하기"}
            </button>
          </div>
        </div>
      </div>

      {viewing && viewingItem && (
        <SourceViewer
          documentId={viewing.documentId}
          itemTitle={viewingItem.title}
          itemContent={edits.find((e) => e.key === viewing.itemKey)?.content ?? ""}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

const toEdit = (i: ReportItem): ItemEdit => ({ key: i.key, content: i.content, needsCheck: i.needsCheck });
