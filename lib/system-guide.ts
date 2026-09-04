import {
  explainMarkdownComponent,
  getDirectiveName,
  listMarkdownComponentsForMcp,
  markdownComponents,
  MARKDOWN_COMPONENT_CATEGORIES,
  type MarkdownComponent,
} from "./markdown-components.ts";
import { buildGlobalAvoidErrorsSection, getComponentAvoidErrors } from "./markdown-pitfalls.ts";
import { TESTCASE_STATUS_LABELS, TESTCASE_STATUSES } from "./living-document-mutations.ts";

const MCP_SERVER_VERSION = "0.8.0";

const LIVING_COMPONENT_IDS = new Set(["checklist", "testcase"]);

function blobUploadSection() {
  return {
    title: "Upload de imagens e anexos (MCP)",
    summary:
      "Agentes enviam arquivos para o mesmo Blob storage da UI antes de referenciá-los no Markdown. Requer permissão de edição no documento de destino.",
    tools: [
      {
        name: "upload_image",
        purpose: "report-image",
        limits: "PNG, JPG, WEBP, SVG ou GIF; até 5 MB",
        markdown: ':::figure{src="<url retornada>" alt="..."}',
      },
      {
        name: "upload_file",
        purpose: "report-file",
        limits: "Qualquer tipo; até 5 MB",
        markdown: ':::file{url="<url retornada>" name="<filename>" title="opcional"}',
      },
    ],
    input: {
      document_id: "UUID do documento (ou UUID do link /d/{uuid})",
      content_base64: "Bytes do arquivo em base64 (prefixo data URL opcional)",
      filename: "Nome original com extensão",
      content_type: "MIME type (ex.: image/png, application/pdf)",
    },
    workflow: [
      "get_document ou create_document → obter document_id",
      "upload_image ou upload_file com base64",
      "update_document com :::figure ou :::file usando url (e name para anexos)",
    ],
    rules: ["RN-45", "RN-46", "RN-51"],
  };
}

function livingBehaviorSection() {
  return {
    title: "Comportamento living (estado no Markdown)",
    summary:
      "Checklist e testcase persistem estado no conteúdo fonte quando o visitante autenticado pode editar o documento. Caso contrário, a leitura interativa permanece local ou somente leitura.",
    components: [
      {
        id: "checklist",
        persistence: "Alterna `- [ ]` ↔ `- [x]` na linha correspondente do bloco `:::checklist`.",
        identification: "Item localizado por seção (`##`), índice do bloco e fingerprint estável derivado do título.",
        offlineFallback: "Sem permissão de edição, o navegador pode usar localStorage apenas como cache — o Markdown no servidor prevalece quando editável.",
      },
      {
        id: "testcase",
        persistence: "Atualiza o atributo `status` no opener `:::testcase{id=\"…\" …}`.",
        identification: "Cada cenário exige `id` único no documento.",
        statuses: TESTCASE_STATUSES.map((status) => ({ value: status, label: TESTCASE_STATUS_LABELS[status] })),
      },
    ],
    surfaces: [
      "Prévia interativa do editor",
      "Prévia do rascunho (/documents/{id}/preview)",
      "Links públicos /d/{slug} e /p/{releaseId} somente se a sessão puder mutar o rascunho (owner/editor)",
    ],
    pdfAndPrint: "Exportação PDF/impressão usa o Markdown estático — badges de status, sem controles interativos.",
  };
}

function qaGuidelinesSection() {
  return {
    title: "QA e documentação de testes",
    dos: [
      "Prefira `:::testcase` com id estável (ex.: PRD-01) para cenários de aceite e regressão.",
      "Use status `pending`, `ok`, `partial` ou `error` para registrar execução real.",
      "Descreva pré-condição, passos e resultado esperado no corpo Markdown do testcase.",
      "Use `:::checklist` apenas para tarefas rastreáveis com checkbox.",
      "Consulte `get_system_guide` ou `explain_markdown_component` antes de inventar sintaxe.",
    ],
    donts: [
      "Não use tabelas largas como substituto de casos de teste — perdem status e contexto.",
      "Não coloque critérios informativos ou sintomas em `:::checklist` (use bullets normais).",
      "Não duplique o mesmo `id` de testcase no mesmo documento.",
      "Não espere que toggles em `/p/{releaseId}` alterem o snapshot publicado — mutações vão ao rascunho via `update_document`.",
    ],
    example: `:::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal ainda disponível"}
**Pré-condição:** usuário autenticado com cota semanal

**Passos:** chamar GET /availability

**Resultado esperado:** remaining > 0
:::`,
  };
}

function componentGuideEntry(component: MarkdownComponent) {
  const explanation = explainMarkdownComponent(component.id);
  const directive = getDirectiveName(component);
  return {
    id: component.id,
    title: component.name,
    category: component.category,
    directive: directive ?? null,
    description: component.description,
    living: LIVING_COMPONENT_IDS.has(component.id),
    attributes: explanation?.attributes ?? [],
    rules: explanation?.rules ?? [],
    avoidErrors: explanation?.avoidErrors ?? getComponentAvoidErrors(component),
    syntax: explanation?.syntax,
    steps: explanation?.steps ?? [],
    examples: explanation?.examples ?? [],
    recommendedUse: inferRecommendedUse(component),
  };
}

function inferRecommendedUse(component: MarkdownComponent) {
  if (component.id === "testcase") {
    return "Cenários de QA, critérios de aceite e regressão com status durável.";
  }
  if (component.id === "checklist") {
    return "Tarefas rastreáveis com checkbox; estado persiste no Markdown quando editável.";
  }
  if (component.id === "tests") {
    return "Resultados de suite automatizada (PASS/FAIL), não substitui testcase manual.";
  }
  if (component.category === "Gráficos") {
    return "Métricas quantitativas e comparações visuais.";
  }
  if (component.category === "Operações e qualidade") {
    return "Operação, SLO, changelog e qualidade de serviço.";
  }
  return component.description;
}

export function buildSystemGuide() {
  const componentsByCategory = MARKDOWN_COMPONENT_CATEGORIES.map((category) => ({
    category,
    components: markdownComponents
      .filter((component) => component.category === category)
      .map((component) => componentGuideEntry(component)),
  })).filter((group) => group.components.length > 0);

  return {
    generatedAt: new Date().toISOString(),
    mcpServer: { name: "portulan", version: MCP_SERVER_VERSION },
    overview: {
      product: "Portulan — biblioteca técnica de documentos Markdown com templates, publicação e MCP.",
      documents: "Rascunhos editáveis; publicação cria snapshot imutável (release).",
      links: {
        stable: "/d/{uuid} — identificador fixo (UUID); sempre aponta para a release habilitada mais recente",
        fixed: "/p/{releaseId} — versão fixa; conteúdo não muda após publicada",
      },
      templates: "Paleta, logo e conteúdo-base via list_templates / get_template.",
      auth: "MCP exige Authorization: Bearer com token pessoal (Integrações → MCP no dashboard).",
      preferredTools: [
        "get_system_guide — visão completa e atualizada (este guia)",
        "list_markdown_components — catálogo resumido",
        "explain_markdown_component — detalhe de um componente",
        "get_document / update_document — ler e persistir conteúdo",
        "publish_document — gerar links públicos",
        "upload_image / upload_file — enviar mídia e anexos antes de inserir no Markdown",
      ],
    },
    markdownCatalog: {
      total: markdownComponents.length,
      summary: listMarkdownComponentsForMcp(),
      byCategory: componentsByCategory,
    },
    livingBehavior: livingBehaviorSection(),
    blobUpload: blobUploadSection(),
    qaGuidelines: qaGuidelinesSection(),
    avoidErrors: buildGlobalAvoidErrorsSection(),
  };
}

export function getMcpServerVersion() {
  return MCP_SERVER_VERSION;
}
