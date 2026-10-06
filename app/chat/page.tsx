// ⑧ 챗봇 (DESIGN.md 3.3) — PLAN 26번: 화면 (답변은 PLAN 27번)
import type { Metadata } from "next";
import { connection } from "next/server";
import { ChatRoom } from "@/components/chat/chat-room";
import { PageHeader } from "@/components/page-header";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "챗봇" };

/** 공사명 앞부분 (예: "한빛청사 신축공사" → "한빛청사") */
const shortName = (name: string) => name.split(" ")[0];

export default async function ChatPage() {
  await connection(); // 예시 질문에 최신 공사 목록을 쓴다
  const projects = await listProjects();
  const [a, b, c] = projects.map((p) => shortName(p.name));

  // 등록된 공사 이름으로 예시 질문을 만든다 (공사가 없으면 일반 예시)
  const examples = [
    `${a ?? "OO공사"} 9월 공정률은?`,
    `${b ?? a ?? "OO공사"} 8월에 건설사고가 있었나요?`,
    `${c ?? a ?? "OO공사"} 노임 체불 현황 알려줘`,
  ];

  return (
    <>
      <PageHeader title="챗봇" description="올라온 문서를 근거로 공사 현황을 답해요." />
      <ChatRoom examples={examples} />
    </>
  );
}
