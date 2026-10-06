// ⑧ 챗봇 (DESIGN.md 3.3) — 화면 뼈대
import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "챗봇" };

export default function ChatPage() {
  return (
    <>
      <PageHeader title="챗봇" description="올라온 문서를 근거로 공사 현황을 답해요." />
      <ComingSoon
        items={[
          "대화 말풍선 (내 질문은 오른쪽, AI 답변은 왼쪽)",
          "답변 아래 근거 문서 표시 (📎 문서명 · 작성일)",
          "예시 질문 버튼과 질문 입력칸",
        ]}
      />
    </>
  );
}
