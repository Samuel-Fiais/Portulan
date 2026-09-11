import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  addDocumentShare,
  createDocument,
  createTemplate,
  duplicateDocument,
  deleteDocument,
  deleteTemplate,
  duplicateTemplate,
  getDocument,
  getDocumentRelease,
  getTemplateForUser,
  isDocumentOwner,
  listDocumentReleases,
  listDocumentShares,
  listDocuments,
  listTemplates,
  previewTemplateContent,
  publishDocument,
  restoreDocumentRelease,
  revokeDocumentShare,
  setDocumentDisabled,
  setDocumentPublic,
  setDocumentReleaseDisabled,
  updateDocument,
  updateTemplate,
  validateMcpToken,
} from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import {
  createDocumentCommentForAccess,
  deleteDocumentCommentForAccess,
  listDocumentCommentThreadsForAccess,
} from "@/lib/document-comment-ops";
import { documentShareInputSchema } from "@/lib/validation";
import { documentStatuses } from "@/lib/documents";
import { explainMarkdownComponent, listMarkdownComponentsForMcp } from "@/lib/markdown-components";
import { buildSystemGuide, getMcpServerVersion } from "@/lib/system-guide";
import {
  mcpUploadFileDescription,
  mcpUploadImageDescription,
  runMcpBlobUpload,
} from "@/lib/mcp-blob-upload";

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
    "upload_image",
    {
      title: "Enviar imagem",
      description: mcpUploadImageDescription(),
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID do documento (ou UUID do link /d/{uuid})"),
        content_base64: z.string().min(1).describe("Conteúdo da imagem em base64 (prefixo data URL opcional)"),
        filename: z.string().trim().min(1).max(255).describe("Nome original com extensão (ex.: diagrama.png)"),
        content_type: z.string().trim().min(1).max(120).describe("MIME type (ex.: image/png)"),
      }),
    },
    async ({ document_id, content_base64, filename, content_type }) => {
      const upload = await runMcpBlobUpload({
        userId: requireUserId(),
        purpose: "report-image",
        documentId: document_id,
        contentBase64: content_base64,
        filename,
        contentType: content_type,
      });
      if ("error" in upload) {
        return { ...textResult({ error: upload.error }), isError: true };
      }
      return textResult({
        url: upload.result.url,
        pathname: upload.result.pathname,
        purpose: upload.result.purpose,
        name: upload.result.name,
      });
    },
  );

  server.registerTool(
    "upload_file",
    {
      title: "Enviar anexo",
      description: mcpUploadFileDescription(),
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID do documento (ou UUID do link /d/{uuid})"),
        content_base64: z.string().min(1).describe("Conteúdo do arquivo em base64 (prefixo data URL opcional)"),
        filename: z.string().trim().min(1).max(255).describe("Nome original com extensão (ex.: spec.pdf)"),
        content_type: z.string().trim().min(1).max(120).describe("MIME type (ex.: application/pdf)"),
      }),
    },
    async ({ document_id, content_base64, filename, content_type }) => {
      const upload = await runMcpBlobUpload({
        userId: requireUserId(),
        purpose: "report-file",
        documentId: document_id,
        contentBase64: content_base64,
        filename,
        contentType: content_type,
      });
      if ("error" in upload) {
        return { ...textResult({ error: upload.error }), isError: true };
      }
      return textResult({
        url: upload.result.url,
        name: upload.result.name,
        pathname: upload.result.pathname,
        purpose: upload.result.purpose,
      });
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "Listar documentos",
      description: "Lista e pesquisa documentos técnicos do usuário autenticado.",
      inputSchema: z.object({
        query: z.string().optional().describe("Busca por título, resumo, tag ou conteúdo"),
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
      description: "Obtém um documento completo pelo id ou pelo UUID do link público (/d/{uuid}). Slugs legados (título) ainda resolvem via alias.",
      inputSchema: z.object({ id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}") }),
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
      description: "Cria um documento Markdown associado ao usuário autenticado, sempre privado. O link estável /d/{uuid} recebe um UUID fixo na criação; o título pode ser renomeado depois sem alterar o link. Publicar uma versão não abre o documento a visitantes — use is_public em update_document.",
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
      description: "Atualiza parcialmente o rascunho de um documento, sem criar uma nova versão publicada. Renomear o título não altera o UUID do link /d/{uuid}.",
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
        disabled: z.boolean().optional().describe("Desativa ou reativa os links /d e /p do documento"),
        is_public: z.boolean().optional().describe("true: qualquer pessoa com o link vê a versão publicada; false: só responsável e convidados (padrão na criação)"),
      }),
    },
    async ({ id, template_id, disabled, is_public, ...changes }) => {
      if (disabled !== undefined) {
        const toggled = await setDocumentDisabled(id, disabled, await requireAccessContext());
        if (!toggled) return { ...textResult({ error: "Documento não encontrado" }), isError: true };
      }
      if (is_public !== undefined) {
        const toggled = await setDocumentPublic(id, is_public, await requireAccessContext());
        if (!toggled) return { ...textResult({ error: "Documento não encontrado ou sem permissão para alterar o acesso público." }), isError: true };
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
    "duplicate_document",
    {
      title: "Duplicar documento",
      description: "Clona um documento como rascunho novo (apenas o responsável). Versões publicadas não são copiadas.",
      inputSchema: z.object({
        id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
        title: z.string().min(3).max(180).optional().describe("Título do clone; padrão: «{título original} — cópia»"),
      }),
    },
    async ({ id, title }) => {
      const document = await duplicateDocument(id, await requireAccessContext(), title ? { title } : undefined);
      return document
        ? textResult({ document })
        : { ...textResult({ error: "Documento não encontrado ou sem permissão (apenas o responsável pode duplicar)." }), isError: true };
    },
  );

  server.registerTool(
    "publish_document",
    {
      title: "Publicar documento",
      description: "Cria uma nova versão imutável a partir do rascunho. O documento permanece privado até is_public=true em update_document.",
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
      inputSchema: z.object({ id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}") }),
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
    "restore_document",
    {
      title: "Restaurar versão no rascunho",
      description:
        "Copia título, resumo, template, autor, time, tags e conteúdo de uma release publicada para o rascunho (RN-09). Não altera releases existentes, não incrementa version e não publica. Estado living do rascunho prevalece (RN-54). Responsável e editor convidado podem restaurar.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
        release_id: z.string().uuid().describe("ID da versão publicada (release) a restaurar"),
      }),
    },
    async ({ document_id, release_id }) => {
      const ctx = await requireAccessContext();
      const current = await getDocument(document_id, ctx);
      if (!current) return { ...textResult({ error: "Documento não encontrado" }), isError: true };

      const release = await getDocumentRelease(release_id);
      if (!release || release.documentId !== current.id) {
        return { ...textResult({ error: "Versão não encontrada." }), isError: true };
      }

      const document = await restoreDocumentRelease(current.id, release_id, ctx);
      if (!document) {
        return { ...textResult({ error: "Versão não encontrada ou sem permissão." }), isError: true };
      }

      return textResult({
        document,
        restoredFromRelease: {
          id: release.id,
          version: release.version,
          publicPath: `/p/${release.id}`,
        },
      });
    },
  );

  server.registerTool(
    "update_document_release",
    {
      title: "Ativar/desativar versão publicada",
      description: "Controla se uma versão fixa (/p/{releaseId}) permanece acessível publicamente.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
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

  const documentCommentFields = {
    body: z.string().trim().min(1).max(2_000),
    section_anchor: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional()
      .nullable()
      .describe("Opcional. ID do bloco na prévia (capa, título ##/###, parágrafo ou componente). Sem âncora = documento inteiro."),
    quoted_text: z
      .string()
      .trim()
      .max(280)
      .optional()
      .nullable()
      .describe("Opcional. Trecho citado do rascunho (até 280 caracteres). Só no comentário-raiz."),
    parent_id: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .describe("Opcional. ID do comentário-raiz ou de uma resposta para responder no mesmo fio (RN-65)."),
  };

  server.registerTool(
    "list_document_comments",
    {
      title: "Listar comentários de revisão",
      description:
        "Lista fios de comentários do rascunho (RN-61). Responsável, editor e leitor convidado veem todos os fios; visitantes em /d ou /p não têm acesso.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
      }),
    },
    async ({ document_id }) => {
      const result = await listDocumentCommentThreadsForAccess(document_id, await requireAccessContext());
      return result.ok
        ? textResult({ documentId: result.documentId, threads: result.threads })
        : { ...textResult({ error: result.error }), isError: true };
    },
  );

  server.registerTool(
    "create_document_comment",
    {
      title: "Criar comentário de revisão",
      description:
        "Cria comentário-raiz (âncora e trecho citado opcionais) ou responde a um fio existente (RN-61, RN-65). Resposta herda âncora do raiz; um nível apenas.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
        ...documentCommentFields,
      }),
    },
    async ({ document_id, section_anchor, quoted_text, parent_id, body }) => {
      const ctx = await requireAccessContext();
      const result = await createDocumentCommentForAccess(
        document_id,
        requireUserId(),
        ctx,
        {
          body,
          sectionAnchor: section_anchor,
          quotedText: quoted_text,
          parentId: parent_id,
        },
      );
      return result.ok
        ? textResult({ documentId: result.documentId, comment: result.comment })
        : { ...textResult({ error: result.error }), isError: true };
    },
  );

  server.registerTool(
    "delete_document_comment",
    {
      title: "Remover comentário de revisão",
      description:
        "Remove o próprio comentário (raiz ou resposta). Remover o raiz encerra o fio (RN-65). Só no editor autenticado — não em /d ou /p.",
      inputSchema: z.object({
        document_id: z.string().min(1).describe("ID UUID ou UUID do link estável /d/{uuid}"),
        comment_id: z.string().uuid().describe("ID do comentário a remover"),
      }),
    },
    async ({ document_id, comment_id }) => {
      const ctx = await requireAccessContext();
      const result = await deleteDocumentCommentForAccess(document_id, comment_id, requireUserId(), ctx);
      return result.ok
        ? textResult({ deleted: true, documentId: result.documentId, commentId: comment_id })
        : { ...textResult({ error: result.error }), isError: true };
    },
  );
}, {
  serverInfo: { name: "portulan", version: getMcpServerVersion() },
  instructions:
    "Use estas ferramentas para consultar e manter a biblioteca técnica Portulan como o usuário autenticado. Envie Authorization: Bearer <token MCP pessoal> em toda requisição. Prefira atualizar documentos existentes quando o assunto já estiver representado. Documentos nascem privados. Use publish_document para gerar uma versão imutável (stablePublicPath /d/{uuid} e publicPath /p/{releaseId}); isso não abre o link a visitantes. Use restore_document para copiar uma release publicada de volta ao rascunho sem publicar (RN-09). Comentários de revisão (list/create/delete) seguem RN-61 e RN-65: só no rascunho autenticado, para quem tem acesso; sem comentário em /d ou /p. Para qualquer pessoa com o link ver a versão publicada, o responsável define is_public=true em update_document. Slugs legados derivados do título ainda resolvem via alias. Para imagens e anexos em relatórios, chame upload_image ou upload_file (base64 + filename + content_type + document_id) antes de inserir a URL retornada em :::figure{src=...} ou :::file{url=... name=...}. Quando não souber como escrever Markdown ou componentes, chame get_system_guide primeiro — leia a seção avoidErrors (Como evitar erros); use list_markdown_components e explain_markdown_component (campo avoidErrors) para detalhes pontuais. Checklist e testcase persistem estado no Markdown quando o usuário pode editar o documento. Use create_template, update_template, get_template e duplicate_template para manter conteúdo-base e paleta dos templates.",
});

async function authenticateMcpRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Token MCP ausente. Gere um token pessoal na tela Integrações do Portulan." },
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
