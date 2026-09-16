import { NextResponse } from "next/server";
import { authenticateCliRequest } from "@/app/api/cli/_auth";
import { getProject, getRepository, listProjectsForRepository } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateCliRequest(request);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const repositoryId = url.searchParams.get("repositoryId");
  const projectIds = url.searchParams.getAll("projectId");
  const issues: string[] = [];

  if (repositoryId) {
    const repository = await getRepository(repositoryId, auth.workspaceId);
    if (!repository) issues.push("Embarcação não encontrada neste porto.");
    else {
      const linked = await listProjectsForRepository(repository.id, auth.workspaceId);
      for (const id of projectIds) {
        if (!linked.some((project) => project.id === id)) {
          const project = await getProject(id, auth.workspaceId);
          issues.push(project ? `Expedição ${project.name} não está vinculada a esta Embarcação.` : "Expedição ausente.");
        }
      }
    }
  } else {
    issues.push("Informe repositoryId.");
  }

  return NextResponse.json({
    ok: issues.length === 0,
    workspaceId: auth.workspaceId,
    issues,
  });
}
