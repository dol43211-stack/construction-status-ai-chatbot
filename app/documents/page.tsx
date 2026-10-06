// ③ 문서 올리기·확인 (DESIGN.md 3.3) — PLAN 11번: 올리기 영역
import type { Metadata } from "next";
import { connection } from "next/server";
import { UploadArea } from "@/components/documents/upload-area";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { countDocuments } from "@/lib/data/documents";

export const metadata: Metadata = { title: "문서" };

export default async function DocumentsPage() {
  await connection(); // 화면을 열 때마다 최신 문서 수를 읽는다
  const total = await countDocuments();

  return (
    <>
      <PageHeader
        title="문서"
        description="감리보고서·업체 보고서·감독지시서를 올리면 AI가 공사명과 기간을 읽어내요."
      />
      <div className="space-y-4">
        <UploadArea />
        <p className="text-sm text-slate-600">지금까지 올라온 문서: {total}건</p>
        <ComingSoon
          items={[
            "문서 표 (파일명 · 공사 · 문서 종류 · 작성일 · 대상 기간 · 확인 여부)",
            "AI가 읽어낸 정보 확인·수정",
          ]}
        />
      </div>
    </>
  );
}
