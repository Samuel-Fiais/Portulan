import { NextResponse } from "next/server";
import { authenticateCliRequest } from "@/app/api/cli/_auth";
import { listProjects } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateCliRequest(request);
  if (auth instanceof Response) return auth;
  const projects = await listProjects(auth.workspaceId);
  return NextResponse.json({ workspaceId: auth.workspaceId, projects });
}
