import { AccessDenied } from "@auth/core/errors";
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

const { GET: authGET, POST: authPOST } = handlers;

function getAccessDeniedCause(error: AccessDenied): unknown {
  const cause = error.cause as { err?: Error } | undefined;
  return cause?.err ?? cause;
}

async function handleAuthRequest(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<Response>,
): Promise<Response> {
  try {
    return await handler(request);
  } catch (error) {
    if (error instanceof AccessDenied) {
      const cause = getAccessDeniedCause(error);
      if (cause instanceof Error) {
        return Response.json({ error: cause.message }, { status: 503 });
      }
    }

    throw error;
  }
}

export function GET(request: NextRequest) {
  return handleAuthRequest(request, authGET);
}

export function POST(request: NextRequest) {
  return handleAuthRequest(request, authPOST);
}
