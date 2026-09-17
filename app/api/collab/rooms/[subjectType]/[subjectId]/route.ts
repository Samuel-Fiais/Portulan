import { collabRoomPayload, openCollabRoom, type CollabRouteContext } from "@/app/api/collab/_room";
import { getLatestCollabSeq } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Entrar na sala do assunto: quem pode ler recebe a sala e a posição em que ela está. */
export async function GET(request: Request, context: CollabRouteContext) {
  const access = await openCollabRoom(request, context, { ensure: true });
  if (access instanceof Response) return access;

  return Response.json({
    room: collabRoomPayload(access),
    latestSeq: (await getLatestCollabSeq(access.room.id)) ?? 0,
  });
}
