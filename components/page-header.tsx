// 화면 맨 위의 제목과 한 줄 설명 (모든 화면에서 같은 모양으로 쓴다)
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-slate-600">{description}</p>}
    </div>
  );
}

/** 아직 만들지 않은 기능 자리 표시 (화면 뼈대 단계에서만 쓴다) */
export function ComingSoon({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <p className="font-semibold text-slate-700">🚧 준비 중인 화면입니다</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
