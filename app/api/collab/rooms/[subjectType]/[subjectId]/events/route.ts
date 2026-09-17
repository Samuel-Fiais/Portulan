import { collabRoomPayload, openCollabRoom, type CollabRouteContext } from "@/app/api/collab/_room";
import { parseCollabPolicyVersionParam, validateCollabPolicyVersion } from "@/lib/collab-room-policy";
import {
  collabEventRequiresOperate,
  CollabEventRejected,
  isCollabClientEventType,
  parseCollabCursor,
} from "@/lib/collab-events";
import { appendCollabEvent, readCollabEventsSince } from "@/lib/db";
import { collabEventInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Retomar a sala do último `seq` visto, em ordem crescente e sem repetição (RN-124). */
export async function GET(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  const search = new URL(request.url).searchParams;
  const cursor = parseCollabCursor({ since: search.get("since"), limit: search.get("limit") });
  if (!cursor.ok) {
    return Response.json({ error: cursor.error }, { status: 400 });
  }

  const page = await readCollabEventsSince(access.room.id, cursor.cursor);
  return Response.json({
    room: collabRoomPayload(access),
    events: page.events,
    latestSeq: page.latestSeq,
    nextSince: page.nextSince,
    hasMore: page.hasMore,
  });
}

/**
 * Publicar evento na sala. A posição e a idempotência são do banco (RN-125): repetir a
 * mesma chave devolve o evento já gravado, sem segunda linha nem nova posição.
 */
export async function POST(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  const parsed = collabEventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Evento inválido", issues: parsed.error.issues }, { status: 400 });
  }

  const search = new URL(request.url).searchParams;
  const clientPolicyVersion = parseCollabPolicyVersionParam(search.get("policy_version"));
  const policy = validateCollabPolicyVersion(clientPolicyVersion, access.room.policyVersion);
  if (!policy.ok) {
    return Response.json(
      { error: policy.error, room: collabRoomPayload(access) },
      { status: 403 },
    );
  }

  const { type, idempotencyKey, intention, baseVersion, payload } = parsed.data;
  if (!isCollabClientEventType(type)) {
    return Response.json(
      { error: "Comando atômico é anunciado pelo servidor, não publicado pelo cliente." },
      { status: 403 },
    );
  }
  if (collabEventRequiresOperate(type) && !access.canOperate) {
    return Response.json({ error: "Este conteúdo não aceita operação ao vivo." }, { status: 403 });
  }

  try {
    const result = await appendCollabEvent({
      roomId: access.room.id,
      workspaceId: access.workspaceId,
      type,
      actor: access.actor,
      intention,
      baseVersion,
      payload,
      idempotencyKey,
    });

    return Response.json(
      { room: collabRoomPayload(access), event: result.event, deduplicated: result.deduplicated },
      { status: result.deduplicated ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof CollabEventRejected) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
