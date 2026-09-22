import { auth } from "@/auth";
import {
  resolveCollabRoomAccess,
  type CollabRoomAccessGrant,
} from "@/lib/collab-room-access";
import { collabRealtimeScopeEnabled } from "@/lib/collab-feature-flags";
import { trackCollabRequestBlocked } from "@/lib/collab-telemetry";
import { collabRoomKey } from "@/lib/collab-rooms";

export type CollabRouteContext = {
  params: Promise<{ subjectType: string; subjectId: string }>;
};

/**
 * Abre a sala do assunto para quem está na sessão, ou devolve a recusa em JSON.
 * `ensure` cria a sala na primeira visita autorizada (RN-119).
 */
export async function openCollabRoom(
  request: Request,
  context: CollabRouteContext,
  options: { ensure: boolean },
): Promise<CollabRoomAccessGrant | Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!collabRealtimeScopeEnabled("presence")) {
    trackCollabRequestBlocked();
    return Response.json(
      { error: "Colaboração ao vivo desligada neste ambiente.", collabDisabled: true },
      { status: 503 },
    );
  }

  const { subjectType, subjectId } = await context.params;
  const access = await resolveCollabRoomAccess({
    userId: session.user.id,
    subjectType: decodeURIComponent(subjectType),
    subjectId: decodeURIComponent(subjectId),
    workspaceId: new URL(request.url).searchParams.get("workspace_id"),
    ensure: options.ensure,
  });
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  return access;
}

/** A sala que o cliente vê: identidade, carimbo de autorização e o que ela permite. */
export function collabRoomPayload(access: CollabRoomAccessGrant) {
  return {
    id: access.room.id,
    key: collabRoomKey(access.room),
    workspaceId: access.room.workspaceId,
    subjectType: access.room.subjectType,
    subjectId: access.room.subjectId,
    policyVersion: access.room.policyVersion,
    canOperate: access.canOperate,
  };
}
