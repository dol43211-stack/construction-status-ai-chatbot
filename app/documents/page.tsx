// ③ 문서 올리기·확인 (DESIGN.md 3.3) — PLAN 11번 올리기 영역, 18번 문서 표
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DocumentFilter } from "@/components/documents/document-filter";
import { DocumentList } from "@/components/documents/document-list";
import { UploadArea } from "@/components/documents/upload-area";
import { PageHeader } from "@/components/page-header";
import { listDocuments } from "@/lib/data/documents";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "문서" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  await connection(); // 화면을 열 때마다 최신 목록을 읽는다
  const params = await searchParams;
  const projectId = typeof params.project === "string" ? params.project : undefined;
  const pendingOnly = params.pending === "1";

  const [projects, documents, allDocuments] = await Promise.all([
    listProjects(),
    listDocuments({ projectId, pendingOnly }),
    listDocuments(),
  ]);
  const pendingCount = allDocuments.filter((d) => !d.confirmed).length;

  return (
    <>
      <PageHeader
        title="문서"
        description="감리보고서·업체 보고서·감독지시서를 올리면 AI가 공사명과 기간을 읽어내요."
      />
      <div className="space-y-6">
        <UploadArea />

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">올라온 문서 {allDocuments.length}건</h2>
              <p className="text-sm text-slate-600">
                {pendingCount > 0 ? (
                  <>
                    🟡 확인 필요 <strong className="text-amber-700">{pendingCount}건</strong> · AI가 읽은 정보를 확인해야 보고서와 챗봇에 쓰여요.
                  </>
                ) : (
                  "모든 문서를 확인했어요."
                )}
              </p>
            </div>
            {/* 주소의 거르기 조건을 읽는 부분은 Suspense로 감싼다 (Next.js 규칙) */}
            <Suspense>
              <DocumentFilter projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
            </Suspense>
          </div>
          <DocumentList documents={documents} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </section>
      </div>
    </>
  );
}
