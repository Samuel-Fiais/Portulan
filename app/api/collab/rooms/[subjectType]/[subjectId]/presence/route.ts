import { collabRoomPayload, openCollabRoom, type CollabRouteContext } from "@/app/api/collab/_room";
import { parseCollabPolicyVersionParam, validateCollabPolicyVersion } from "@/lib/collab-room-policy";
import { validatePresenceIntention } from "@/lib/collab-presence";
import {
  joinOrHeartbeatPresence,
  leavePresenceSession,
  listActivePresenceViews,
} from "@/lib/db/presence-sessions";
import { collabPresenceInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Quem está na sala agora — sessões ativas, sem revogadas nem expiradas (RN-119, RN-121). */
export async function GET(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  const presence = await listActivePresenceViews(access.room.id);
  return Response.json({
    room: collabRoomPayload(access),
    presence,
  });
}

/** Entrar, renovar batida ou sair da sala (RN-123). */
export async function POST(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  const search = new URL(request.url).searchParams;
  const clientPolicyVersion = parseCollabPolicyVersionParam(search.get("policy_version"));
  const policy = validateCollabPolicyVersion(clientPolicyVersion, access.room.policyVersion);
  if (!policy.ok) {
    return Response.json(
      { error: policy.error, room: collabRoomPayload(access) },
      { status: 403 },
    );
  }

  const parsed = collabPresenceInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Presença inválida", issues: parsed.error.issues }, { status: 400 });
  }

  const { action, intention, clientInfo } = parsed.data;
  if (action !== "leave") {
    const validIntention = validatePresenceIntention(intention);
    if (!validIntention.ok) {
      return Response.json({ error: validIntention.error }, { status: 400 });
    }
  }

  if (action === "leave") {
    await leavePresenceSession(access.room.id, access.actor);
    const presence = await listActivePresenceViews(access.room.id);
    return Response.json({ room: collabRoomPayload(access), presence, session: null });
  }

  const session = await joinOrHeartbeatPresence({
    roomId: access.room.id,
    workspaceId: access.workspaceId,
    actor: access.actor,
    intention,
    clientInfo,
  });

  if (session.revokedAt) {
    return Response.json(
      { error: "Presença encerrada por perda de acesso.", room: collabRoomPayload(access) },
      { status: 403 },
    );
  }

  const presence = await listActivePresenceViews(access.room.id);
  return Response.json({
    room: collabRoomPayload(access),
    session: {
      id: session.id,
      intention: session.intention,
      joinedAt: session.joinedAt,
      lastSeenAt: session.lastSeenAt,
    },
    presence,
  });
}
