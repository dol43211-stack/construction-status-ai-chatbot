// ② 공사 목록 (DESIGN.md 3.3) — PLAN 10번
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { AddProjectForm } from "@/components/projects/add-project-form";
import { ProjectList } from "@/components/projects/project-list";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "공사 목록" };

export default async function ProjectsPage() {
  await connection(); // 빌드할 때가 아니라, 화면을 열 때마다 최신 목록을 읽는다
  const projects = await listProjects();

  return (
    <>
      <PageHeader title="공사 목록" description="관리하는 공사를 등록하면, 올린 문서와 보고서가 이 공사명으로 묶여요." />
      <div className="space-y-4">
        <AddProjectForm />
        <ProjectList projects={projects} />
      </div>
    </>
  );
}
