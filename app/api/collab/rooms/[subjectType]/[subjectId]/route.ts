import { collabRoomPayload, openCollabRoom, type CollabRouteContext } from "@/app/api/collab/_room";
import { collabContentOpSupported } from "@/lib/collab-content-ops";
import { getCollabContentSnapshot, getLatestCollabSeq } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Entrar na sala do assunto: quem pode ler recebe a sala e a posição em que ela está. */
export async function GET(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  const body: Record<string, unknown> = {
    room: collabRoomPayload(access),
    latestSeq: (await getLatestCollabSeq(access.room.id)) ?? 0,
  };

  if (access.canOperate && collabContentOpSupported(access.room.subjectType)) {
    const snapshot = await getCollabContentSnapshot({
      subjectType: access.room.subjectType,
      subjectId: access.room.subjectId,
    });
    if (snapshot) body.contentSnapshot = snapshot;
  }

  return Response.json(body);
}
