"use client";
// 파일 끌어다 놓기 영역 + 파일별 진행 상태 (DESIGN.md 3.3 ③)
// - 올리기 전에 화면에서 먼저 검사한다 (형식·4MB·10개).
// - 서버 한도(요청 1건 4.5MB) 때문에 파일은 1개씩 차례로 보낸다.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ACCEPT, checkFile, MAX_FILES, UPLOAD_MESSAGES } from "@/lib/documents/upload-rules";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

type Status = "waiting" | "uploading" | "done" | "error";
type Item = { key: string; name: string; status: Status; message?: string };

const STATUS_LABEL: Record<Status, string> = {
  waiting: "⏳ 기다리는 중",
  uploading: "⏳ 올리는 중",
  done: "✅ 완료",
  error: "⚠️",
};

export function UploadArea() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = items.some((i) => i.status === "waiting" || i.status === "uploading");

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function start(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || busy) return;
    if (files.length > MAX_FILES) {
      setNotice(UPLOAD_MESSAGES.tooMany);
      return;
    }
    setNotice(null);

    // 화면에서 먼저 검사: 문제가 있는 파일은 바로 ⚠️로 표시하고 보내지 않는다.
    const batch = files.map((file, n) => {
      const problem = checkFile(file.name, file.size);
      return {
        file,
        item: {
          key: `${Date.now()}-${n}`,
          name: file.name,
          status: problem ? "error" : "waiting",
          message: problem ?? undefined,
        } satisfies Item,
      };
    });
    setItems(batch.map((b) => b.item));

    for (const { file, item } of batch) {
      if (item.status === "error") continue;
      update(item.key, { status: "uploading" });
      const body = new FormData();
      body.append("file", file);
      const result = await fetchWithTimeout(`/api/documents`, { method: "POST", body });
      update(item.key, result.ok ? { status: "done" } : { status: "error", message: result.message });
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh(); // 올라온 문서 수 등 화면 정보를 새로 읽는다
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void start(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="text-3xl" aria-hidden>
          📂
        </span>
        <span className="font-semibold text-slate-800">파일을 여기에 끌어다 놓거나 눌러서 고르세요</span>
        <span className="text-sm text-slate-500">PDF·.hwpx·.xlsx, 1개당 4MB, 한 번에 {MAX_FILES}개까지</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => void start(e.target.files)}
          className="sr-only"
          aria-label="올릴 문서 고르기"
        />
      </label>

      {notice && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          ⚠️ {notice}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 text-sm" aria-live="polite">
          {items.map((i) => (
            <li key={i.key} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
              <span className="min-w-0 break-all text-slate-800">{i.name}</span>
              <span className={i.status === "error" ? "text-red-600" : "text-slate-600"}>
                {STATUS_LABEL[i.status]} {i.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
