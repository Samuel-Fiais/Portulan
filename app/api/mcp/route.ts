import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createDocument, deleteDocument, getDocument, listDocumentReleases, listDocuments, publishDocument, updateDocument } from "@/lib/db";
import { documentStatuses, documentTypes } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serviceContext = { bypassOwnership: true } as const;

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "list_documents",
    {
      title: "Listar documentos",
      description: "Lista e pesquisa documentos técnicos no Portulan. Operação em nível de serviço (sem identidade por usuário).",
      inputSchema: z.object({
        query: z.string().optional().describe("Busca por título, resumo ou tag"),
        type: z.enum(documentTypes).optional(),
        status: z.enum(documentStatuses).optional(),
      }),
    },
    async (filters) => textResult({ documents: await listDocuments(filters, serviceContext) }),
  );

  server.registerTool(
    "get_document",
    {
      title: "Ler documento",
      description: "Obtém um documento completo pelo id ou slug.",
      inputSchema: z.object({ id: z.string().min(1).describe("ID ou slug do documento") }),
    },
    async ({ id }) => {
      const document = await getDocument(id, serviceContext);
      return document ? textResult({ document }) : { ...textResult({ error: "Documento não encontrado" }), isError: true };
    },
  );

  server.registerTool(
    "create_document",
    {
      title: "Criar documento",
      description: "Cria um documento Markdown (user_id nulo — nível de serviço até suporte a identidade MCP).",
      inputSchema: z.object({
        title: z.string().min(3).max(180),
        summary: z.string().max(500).default(""),
        type: z.enum(documentTypes),
        status: z.enum(documentStatuses).default("draft"),
        author: z.string().max(100).default("Agente de IA"),
        team: z.string().max(100).default(""),
        tags: z.array(z.string().min(1).max(40)).max(12).default([]),
        content: z.string().max(250_000).default(""),
      }),
    },
    async (input) => textResult({ document: await createDocument(input, { userId: null }) }),
  );

  server.registerTool(
    "update_document",
    {
      title: "Editar documento",
      description: "Atualiza parcialmente um documento. Cada alteração incrementa sua versão.",
      inputSchema: z.object({
        id: z.string().min(1),
        title: z.string().min(3).max(180).optional(),
        summary: z.string().max(500).optional(),
        type: z.enum(documentTypes).optional(),
        status: z.enum(documentStatuses).optional(),
        author: z.string().max(100).optional(),
        team: z.string().max(100).optional(),
        tags: z.array(z.string().min(1).max(40)).max(12).optional(),
        content: z.string().max(250_000).optional(),
      }),
    },
    async ({ id, ...changes }) => {
      const document = await updateDocument(id, changes, serviceContext);
      return document ? textResult({ document }) : { ...textResult({ error: "Documento não encontrado" }), isError: true };
    },
  );

  server.registerTool(
    "delete_document",
    {
      title: "Excluir documento",
      description: "Exclui definitivamente um documento pelo id.",
      inputSchema: z.object({ id: z.string().uuid() }),
    },
    async ({ id }) => {
      const deleted = await deleteDocument(id, serviceContext);
      return deleted ? textResult({ deleted: true, id }) : { ...textResult({ error: "Documento não encontrado" }), isError: true };
    },
  );

  server.registerTool(
    "publish_document",
    {
      title: "Publicar documento",
      description: "Publica o documento na versão atual, cria um snapshot imutável e retorna o link público compartilhável.",
      inputSchema: z.object({
        id: z.string().min(1),
        title: z.string().min(3).max(180).optional(),
        summary: z.string().max(500).optional(),
        type: z.enum(documentTypes).optional(),
        author: z.string().max(100).optional(),
        team: z.string().max(100).optional(),
        tags: z.array(z.string().min(1).max(40)).max(12).optional(),
        content: z.string().max(250_000).optional(),
      }),
    },
    async ({ id, ...changes }) => {
      const result = await publishDocument(id, changes, serviceContext);
      if (!result) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      return textResult({
        document: result.document,
        release: result.release,
        publicPath: `/p/${result.release.id}`,
      });
    },
  );

  server.registerTool(
    "list_document_releases",
    {
      title: "Listar publicações",
      description: "Lista os links públicos já gerados para um documento, por versão.",
      inputSchema: z.object({ id: z.string().min(1).describe("ID ou slug do documento") }),
    },
    async ({ id }) => {
      const document = await getDocument(id, serviceContext);
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      const releases = (await listDocumentReleases(document.id)).map((release) => ({
        ...release,
        publicPath: `/p/${release.id}`,
      }));
      return textResult({ documentId: document.id, releases });
    },
  );
}, {
  serverInfo: { name: "portulan", version: "0.3.0" },
  instructions: "Use estas ferramentas para consultar e manter a biblioteca técnica Portulan. Com MCP_API_KEY, as operações são em nível de serviço (sem identidade por usuário). Prefira atualizar documentos existentes quando o assunto já estiver representado. Use publish_document para gerar links públicos imutáveis por versão.",
});

async function handler(request: Request) {
  const apiKey = process.env.MCP_API_KEY;
  if (apiKey && request.headers.get("authorization") !== `Bearer ${apiKey}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  return mcpHandler(request);
}

export { handler as GET, handler as POST, handler as DELETE };
