// ② 공사 목록 (DESIGN.md 3.3) — 화면 뼈대
import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "공사 목록" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="공사 목록" description="관리하는 공사를 등록하면, 올린 문서와 보고서가 이 공사명으로 묶여요." />
      <ComingSoon
        items={[
          "공사명 입력칸과 [추가] 버튼",
          "등록된 공사 표 (공사명 · 연결된 문서 수 · 이름 수정 · 삭제)",
        ]}
      />
    </>
  );
}
