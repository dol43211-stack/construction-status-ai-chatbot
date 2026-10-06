// ③ 문서 올리기·확인 (DESIGN.md 3.3) — 화면 뼈대
import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "문서" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="문서"
        description="감리보고서·업체 보고서·감독지시서를 올리면 AI가 공사명과 기간을 읽어내요."
      />
      <ComingSoon
        items={[
          "파일 끌어다 놓기 영역 (PDF·.hwpx·.xlsx, 1개당 4MB, 한 번에 10개까지)",
          "올리는 중인 파일별 진행 상태",
          "문서 표 (파일명 · 공사 · 문서 종류 · 작성일 · 대상 기간 · 확인 여부)",
        ]}
      />
    </>
  );
}
