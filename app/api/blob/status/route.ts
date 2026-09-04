import { auth } from "@/auth";
import { getBlobReadWriteToken, getBlobStorageHint } from "@/lib/blob-env";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Faça login para verificar o armazenamento." }, { status: 401 });
  }

  const configured = Boolean(getBlobReadWriteToken());
  return Response.json({
    configured,
    hint: configured ? null : getBlobStorageHint(),
  });
}
