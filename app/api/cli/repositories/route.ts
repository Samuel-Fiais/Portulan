import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCliRequest } from "@/app/api/cli/_auth";
import {
  createRepository,
  findRepositoryByName,
  findRepositoryByRemote,
  getProject,
  getRepository,
  linkProjectRepository,
  listProjectsForRepository,
} from "@/lib/db/projects";
import { validateRepositoryMutation } from "@/lib/project-policy";
import { repositoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const cliRepositorySchema = repositoryInputSchema.extend({
  projectIds: z.array(z.string().uuid()).optional(),
  repositoryId: z.string().uuid().optional(),
});

async function linkSelectedProjects(
  workspaceId: string,
  repositoryId: string,
  projectIds: string[] | undefined,
) {
  if (!projectIds?.length) return;
  for (const projectId of projectIds) {
    const project = await getProject(projectId, workspaceId);
    if (!project) continue;
    await linkProjectRepository({
      projectId,
      repositoryId,
      role: "primary",
    });
  }
}

export async function GET(request: Request) {
  const auth = await authenticateCliRequest(request);
  if (auth instanceof Response) return auth;
  const { listRepositories } = await import("@/lib/db/projects");
  const repositories = await listRepositories(auth.workspaceId);
  return NextResponse.json({ workspaceId: auth.workspaceId, repositories });
}

export async function POST(request: Request) {
  const auth = await authenticateCliRequest(request);
  if (auth instanceof Response) return auth;
  const body = await request.json().catch(() => ({}));
  const parsed = cliRepositorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados da Embarcação inválidos." }, { status: 400 });

  if (parsed.data.repositoryId) {
    const existing = await getRepository(parsed.data.repositoryId, auth.workspaceId);
    if (!existing) return NextResponse.json({ error: "Embarcação não encontrada." }, { status: 404 });
    await linkSelectedProjects(auth.workspaceId, existing.id, parsed.data.projectIds);
    const projects = await listProjectsForRepository(existing.id, auth.workspaceId);
    return NextResponse.json({ repository: existing, projects, linked: true });
  }

  const validated = validateRepositoryMutation({
    role: auth.role,
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
  });
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const existing = parsed.data.remoteUrl
    ? await findRepositoryByRemote(auth.workspaceId, parsed.data.remoteUrl)
    : await findRepositoryByName(auth.workspaceId, parsed.data.name);

  if (existing) {
    await linkSelectedProjects(auth.workspaceId, existing.id, parsed.data.projectIds);
    const projects = await listProjectsForRepository(existing.id, auth.workspaceId);
    return NextResponse.json({ repository: existing, projects, linked: true });
  }

  const repository = await createRepository({
    workspaceId: auth.workspaceId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
    notes: parsed.data.notes,
    createdBy: auth.userId,
  });
  await linkSelectedProjects(auth.workspaceId, repository.id, parsed.data.projectIds);
  const projects = await listProjectsForRepository(repository.id, auth.workspaceId);
  return NextResponse.json({ repository, projects, linked: false });
}
