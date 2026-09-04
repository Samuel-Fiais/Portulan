import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  addDocumentShare,
  createDocument,
  createTemplate,
  deleteDocument,
  deleteTemplate,
  duplicateTemplate,
  getDocument,
  getTemplateForUser,
  isDocumentOwner,
  listDocumentReleases,
  listDocumentShares,
  listDocuments,
  listTemplates,
  previewTemplateContent,
  publishDocument,
  revokeDocumentShare,
  setDocumentDisabled,
  setDocumentReleaseDisabled,
  updateDocument,
  updateTemplate,
  validateMcpToken,
} from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { documentShareInputSchema } from "@/lib/validation";
import { documentStatuses } from "@/lib/documents";
import { explainMarkdownComponent, listMarkdownComponentsForMcp } from "@/lib/markdown-components";
import { buildSystemGuide, getMcpServerVersion } from "@/lib/system-guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpUserStore = new AsyncLocalStorage<{ userId: string }>();

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

function requireUserId() {
  const userId = mcpUserStore.getStore()?.userId;
  if (!userId) throw new Error("Não autorizado");
  return userId;
}

async function requireAccessContext() {
  return documentAccessContext(requireUserId());
}

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "list_templates",
    {
      title: "Listar templates",
      description: "Lista os templates disponíveis para o usuário autenticado (inclui o template Default).",
      inputSchema: z.object({}),
    },
    async () => textResult({ templates: await listTemplates(requireUserId()) }),
  );

  const templateFields = {
    name: z.string().trim().min(1).max(80),
    primary_color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary_color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
    logo_url: z.union([z.string().trim().url().max(2048), z.literal(""), z.null()]).optional(),
    content: z.string().max(250_000).default(""),
  };

  server.registerTool(
    "create_template",
    {
      title: "Criar template",
      description: "Cria um template particular de documento, com paleta, logo opcional e conteúdo Markdown inicial.",
      inputSchema: z.object(templateFields),
    },
    async ({ primary_color, secondary_color, logo_url, ...input }) =>
      textResult({
        template: await createTemplate(requireUserId(), {
          ...input,
          primaryColor: primary_color,
          secondaryColor: secondary_color,
          logoUrl: logo_url === "" ? null : logo_url ?? null,
        }),
      }),
  );

  server.registerTool(
    "update_template",
    {
      title: "Editar template",
      description: "Atualiza parcialmente nome, cores, logo ou conteúdo-base de um template. Não cria versão de documentos.",
      inputSchema: z.object({
        id: z.string().min(1),
        name: templateFields.name.optional(),
        primary_color: templateFields.primary_color.optional(),
        secondary_color: templateFields.secondary_color.optional(),
        logo_url: templateFields.logo_url,
        content: z.string().max(250_000).optional(),
      }).refine((input) => input.name !== undefined || input.primary_color !== undefined || input.secondary_color !== undefined || input.logo_url !== undefined || input.content !== undefined, { message: "Informe ao menos um campo para atualizar." }),
    },
    async ({ id, primary_color, secondary_color, logo_url, ...input }) => {
      const template = await updateTemplate(requireUserId(), id, {
        ...input,
        primaryColor: primary_color,
        secondaryColor: secondary_color,
        ...(logo_url !== undefined ? { logoUrl: logo_url === "" ? null : logo_url } : {}),
      });
      return template ? textResult({ template }) : { ...textResult({ error: "Template não encontrado ou sem permissão." }), isError: true };
    },
  );

  server.registerTool(
    "delete_template",
    {
      title: "Excluir template",
      description: "Exclui definitivamente um template particular. Templates internos não podem ser excluídos.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => {
      const deleted = await deleteTemplate(requireUserId(), id);
      return deleted ? textResult({ deleted: true, id }) : { ...textResult({ error: "Template não encontrado, interno ou sem permissão." }), isError: true };
    },
  );

  server.registerTool(
    "get_template",
    {
      title: "Ler template",
      description: "Obtém um template completo pelo id, incluindo conteúdo-base e paleta de cores.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => {
      const template = await getTemplateForUser(id, requireUserId());
      return template ? textResult({ template }) : { ...textResult({ error: "Template não encontrado ou sem permissão." }), isError: true };
    },
  );

  server.registerTool(
    "duplicate_template",
    {
      title: "Duplicar template",
      description: "Clona um template acessível em um novo template particular do usuário autenticado.",
      inputSchema: z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(80).optional().describe("Nome do clone; padrão: Cópia de {nome original}"),
      }),
    },
    async ({ id, name }) => {
      const template = await duplicateTemplate(requireUserId(), id, { name });
      return template ? textResult({ template }) : { ...textResult({ error: "Template não encontrado ou sem permissão." }), isError: true };
    },
  );

  server.registerTool(
    "preview_template",
    {
      title: "Pré-visualizar template",
      description: "Retorna nome, cores e um resumo leve do conteúdo-base (títulos e trecho inicial).",
      inputSchema: z.object({
        id: z.string().min(1),
        max_chars: z.number().int().min(80).max(2000).default(400),
      }),
    },
    async ({ id, max_chars }) => {
      const template = await getTemplateForUser(id, requireUserId());
      if (!template) return { ...textResult({ error: "Template não encontrado ou sem permissão." }), isError: true };
      const preview = previewTemplateContent(template.content, max_chars);
      return textResult({
        id: template.id,
        name: template.name,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        ...preview,
      });
    },
  );

  server.registerTool(
    "get_system_guide",
    {
      title: "Guia do sistema Portulan",
      description:
        "Retorna guia completo e atualizado: produto, publicação, autenticação MCP, catálogo de componentes Markdown, seção Como evitar erros (armadilhas de sintaxe), comportamentos living e boas práticas de QA. Preferir esta ferramenta quando não souber como escrever conteúdo.",
      inputSchema: z.object({}),
    },
    async () => textResult({ guide: buildSystemGuide() }),
  );

  server.registerTool(
    "list_markdown_components",
    {
      title: "Listar componentes Markdown",
      description: "Lista diretivas customizadas e entradas Markdown do catálogo Portulan, com preview e atributos.",
      inputSchema: z.object({}),
    },
    async () => textResult({ components: listMarkdownComponentsForMcp() }),
  );

  server.registerTool(
    "explain_markdown_component",
    {
      title: "Explicar componente Markdown",
      description: "Retorna sintaxe, atributos, formato do corpo, armadilhas (avoidErrors) e exemplos para um componente por id, nome ou diretiva.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Id (ex.: alert), título pt-BR (ex.: Alerta) ou diretiva (ex.: stats)"),
      }),
    },
    async ({ name }) => {
      const explanation = explainMarkdownComponent(name);
      return explanation
        ? textResult({ component: explanation })
        : { ...textResult({ error: "Componente Markdown não encontrado." }), isError: true };
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "Listar documentos",
      description: "Lista e pesquisa documentos técnicos do usuário autenticado.",
      inputSchema: z.object({
        query: z.string().optional().describe("Busca por título, resumo ou tag"),
        template_id: z.string().optional(),
        status: z.enum(documentStatuses).optional(),
      }),
    },
    async (filters) =>
      textResult({
        documents: await listDocuments(
          { query: filters.query, templateId: filters.template_id, status: filters.status },
          await requireAccessContext(),
        ),
      }),
  );

  server.registerTool(
    "get_document",
    {
      title: "Ler documento",
      description: "Obtém um documento completo pelo id ou slug.",
      inputSchema: z.object({ id: z.string().min(1).describe("ID ou slug do documento") }),
    },
    async ({ id }) => {
      const document = await getDocument(id, await requireAccessContext());
      return document ? textResult({ document }) : { ...textResult({ error: "Documento não encontrado" }), isError: true };
    },
  );

  server.registerTool(
    "create_document",
    {
      title: "Criar documento",
      description: "Cria um documento Markdown associado ao usuário autenticado.",
      inputSchema: z.object({
        title: z.string().min(3).max(180),
        summary: z.string().max(500).default(""),
        template_id: z.string().min(1).describe("ID do template (use list_templates)"),
        status: z.enum(documentStatuses).default("draft"),
        author: z.string().max(100).default("Agente de IA"),
        team: z.string().max(100).default(""),
        tags: z.array(z.string().min(1).max(40)).max(12).default([]),
        content: z.string().max(250_000).default(""),
      }),
    },
    async (input) => {
      const ctx = await requireAccessContext();
      const document = await createDocument(
        {
          title: input.title,
          summary: input.summary,
          templateId: input.template_id,
          status: input.status,
          author: input.author,
          team: input.team,
          tags: input.tags,
          content: input.content,
        },
        { userId: ctx.userId },
      );
      return textResult({ document });
    },
  );

  server.registerTool(
    "update_document",
    {
      title: "Editar documento",
      description: "Atualiza parcialmente o rascunho de um documento, sem criar uma nova versão publicada.",
      inputSchema: z.object({
        id: z.string().min(1),
        title: z.string().min(3).max(180).optional(),
        summary: z.string().max(500).optional(),
        template_id: z.string().min(1).optional(),
        status: z.enum(documentStatuses).optional(),
        author: z.string().max(100).optional(),
        team: z.string().max(100).optional(),
        tags: z.array(z.string().min(1).max(40)).max(12).optional(),
        content: z.string().max(250_000).optional(),
        disabled: z.boolean().optional().describe("Desativa ou reativa o acesso público a todo o documento"),
      }),
    },
    async ({ id, template_id, disabled, ...changes }) => {
      if (disabled !== undefined) {
        const toggled = await setDocumentDisabled(id, disabled, await requireAccessContext());
        if (!toggled) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      }
      const document = await updateDocument(id, { ...changes, templateId: template_id }, await requireAccessContext());
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
      const deleted = await deleteDocument(id, await requireAccessContext());
      return deleted ? textResult({ deleted: true, id }) : { ...textResult({ error: "Documento não encontrado" }), isError: true };
    },
  );

  server.registerTool(
    "publish_document",
    {
      title: "Publicar documento",
      description: "Cria uma nova versão publicada a partir do rascunho, com snapshot imutável e link público compartilhável.",
      inputSchema: z.object({
        id: z.string().min(1),
        title: z.string().min(3).max(180).optional(),
        summary: z.string().max(500).optional(),
        template_id: z.string().min(1).optional(),
        author: z.string().max(100).optional(),
        team: z.string().max(100).optional(),
        tags: z.array(z.string().min(1).max(40)).max(12).optional(),
        content: z.string().max(250_000).optional(),
      }),
    },
    async ({ id, template_id, ...changes }) => {
      const result = await publishDocument(id, { ...changes, templateId: template_id }, await requireAccessContext());
      if (!result) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      if ("noChanges" in result) {
        return { ...textResult({ error: "Não há alterações em relação à última versão publicada." }), isError: true };
      }
      return textResult({
        document: result.document,
        release: result.release,
        publicPath: `/p/${result.release.id}`,
        stablePublicPath: `/d/${result.document.slug}`,
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
      const document = await getDocument(id, await requireAccessContext());
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      const releases = (await listDocumentReleases(document.id)).map((release) => ({
        ...release,
        publicPath: `/p/${release.id}`,
      }));
      return textResult({
        documentId: document.id,
        slug: document.slug,
        stablePublicPath: `/d/${document.slug}`,
        releases,
      });
    },
  );

  server.registerTool(
    "update_document_release",
    {
      title: "Ativar/desativar versão publicada",
      description: "Controla se uma versão fixa (/p/{releaseId}) permanece acessível publicamente.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID ou slug do documento"),
        release_id: z.string().uuid().describe("ID da versão publicada"),
        disabled: z.boolean().describe("true desativa a versão; false reativa"),
      }),
    },
    async ({ document_id, release_id, disabled }) => {
      const document = await getDocument(document_id, await requireAccessContext());
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      const release = await setDocumentReleaseDisabled(document.id, release_id, disabled, await requireAccessContext());
      if (!release) return { ...textResult({ error: "Versão não encontrada" }), isError: true };
      return textResult({
        release,
        publicPath: `/p/${release.id}`,
        disabled: release.disabled,
      });
    },
  );

  server.registerTool(
    "list_document_shares",
    {
      title: "Listar compartilhamentos",
      description: "Lista convites por e-mail de um documento privado (apenas o responsável).",
      inputSchema: z.object({ document_id: z.string().min(1) }),
    },
    async ({ document_id }) => {
      const ctx = await requireAccessContext();
      const document = await getDocument(document_id, ctx);
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      if (!isDocumentOwner(document, ctx)) {
        return { ...textResult({ error: "Apenas o responsável pode listar compartilhamentos." }), isError: true };
      }
      return textResult({ shares: await listDocumentShares(document.id) });
    },
  );

  server.registerTool(
    "share_document",
    {
      title: "Compartilhar documento",
      description: "Convida alguém por e-mail como leitor ou editor de um documento privado.",
      inputSchema: z.object({
        document_id: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["viewer", "editor"]).default("viewer"),
      }),
    },
    async (input) => {
      const parsed = documentShareInputSchema.safeParse({ email: input.email, role: input.role });
      if (!parsed.success) return { ...textResult({ error: "E-mail ou papel inválido." }), isError: true };

      const ctx = await requireAccessContext();
      const document = await getDocument(input.document_id, ctx);
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      if (!isDocumentOwner(document, ctx)) {
        return { ...textResult({ error: "Apenas o responsável pode compartilhar." }), isError: true };
      }

      const result = await addDocumentShare(document.id, parsed.data.email, parsed.data.role, ctx.userId!);
      return result.ok
        ? textResult({ share: result.share })
        : { ...textResult({ error: result.error }), isError: true };
    },
  );

  server.registerTool(
    "revoke_document_share",
    {
      title: "Revogar compartilhamento",
      description: "Remove o acesso de um convite por e-mail (apenas o responsável).",
      inputSchema: z.object({
        document_id: z.string().min(1),
        share_id: z.string().uuid(),
      }),
    },
    async ({ document_id, share_id }) => {
      const ctx = await requireAccessContext();
      const document = await getDocument(document_id, ctx);
      if (!document) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      if (!isDocumentOwner(document, ctx)) {
        return { ...textResult({ error: "Apenas o responsável pode revogar compartilhamentos." }), isError: true };
      }

      const revoked = await revokeDocumentShare(share_id, document.id);
      return revoked
        ? textResult({ revoked: true })
        : { ...textResult({ error: "Compartilhamento não encontrado." }), isError: true };
    },
  );
}, {
  serverInfo: { name: "portulan", version: getMcpServerVersion() },
  instructions:
    "Use estas ferramentas para consultar e manter a biblioteca técnica Portulan como o usuário autenticado. Envie Authorization: Bearer <token MCP pessoal> em toda requisição. Prefira atualizar documentos existentes quando o assunto já estiver representado. Use publish_document para gerar links públicos: stablePublicPath (/d/{slug}) aponta sempre para a última versão; publicPath (/p/{releaseId}) fixa uma versão específica. Quando não souber como escrever Markdown ou componentes, chame get_system_guide primeiro — leia a seção avoidErrors (Como evitar erros); use list_markdown_components e explain_markdown_component (campo avoidErrors) para detalhes pontuais. Checklist e testcase persistem estado no Markdown quando o usuário pode editar o documento. Use create_template, update_template, get_template e duplicate_template para manter conteúdo-base e paleta dos templates.",
});

async function authenticateMcpRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Token MCP ausente. Gere um token pessoal no dashboard Portulan (Integrações → MCP)." },
      { status: 401 },
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const userId = await validateMcpToken(token);
  if (!userId) {
    return Response.json({ error: "Token MCP inválido ou revogado." }, { status: 401 });
  }

  return { userId };
}

async function handler(request: Request) {
  const authResult = await authenticateMcpRequest(request);
  if (authResult instanceof Response) return authResult;
  return mcpUserStore.run({ userId: authResult.userId }, () => mcpHandler(request));
}

export { handler as GET, handler as POST, handler as DELETE };
