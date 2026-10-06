// ④ 새 보고서 만들기 (DESIGN.md 3.3) — 화면 뼈대
import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "새 보고서 만들기" };

export default function NewReportPage() {
  return (
    <>
      <PageHeader title="새 보고서 만들기" description="공사와 기간을 고르면 AI가 9개 항목 초안을 써요." />
      <ComingSoon
        items={[
          "1단계: 공사 고르기",
          "2단계: 주간(월~일) 또는 월간(1일~말일) 고르기",
          "3단계: 이 기간에 해당하는 문서 미리보기",
          "[초안 만들기] 버튼 (최대 2분)",
        ]}
      />
    </>
  );
}
