export const documentTypes = ["feature", "incident", "report", "reference"] as const;
export const documentStatuses = ["draft", "review", "published", "archived"] as const;

export type DocumentType = (typeof documentTypes)[number];
export type DocumentStatus = (typeof documentStatuses)[number];

export type DocumentRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: DocumentType;
  status: DocumentStatus;
  author: string;
  team: string;
  tags: string[];
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type DocumentRelease = {
  id: string;
  documentId: string;
  version: number;
  title: string;
  summary: string;
  type: DocumentType;
  author: string;
  team: string;
  tags: string[];
  content: string;
  publishedAt: string;
};

export function releaseToDocumentRecord(release: DocumentRelease): DocumentRecord {
  return {
    id: release.documentId,
    slug: "",
    title: release.title,
    summary: release.summary,
    type: release.type,
    status: "published",
    author: release.author,
    team: release.team,
    tags: release.tags,
    content: release.content,
    version: release.version,
    createdAt: release.publishedAt,
    updatedAt: release.publishedAt,
    publishedAt: release.publishedAt,
  };
}

export type DocumentInput = Pick<
  DocumentRecord,
  "title" | "summary" | "type" | "status" | "author" | "team" | "tags" | "content"
>;

export const typeMeta: Record<DocumentType, { label: string; short: string; accent: string; primary: string; secondary: string }> = {
  feature: { label: "Nova feature", short: "Feature", accent: "var(--purple)", primary: "#7C2BE3", secondary: "#F04E37" },
  incident: { label: "Incidente / erro", short: "Incidente", accent: "var(--coral)", primary: "#F04E37", secondary: "#00D4B4" },
  report: { label: "Relatório", short: "Relatório", accent: "var(--teal-ink)", primary: "#00A891", secondary: "#F04E37" },
  reference: { label: "Referência técnica", short: "Referência", accent: "var(--indigo)", primary: "#3D3580", secondary: "#00D4B4" },
};

export const statusMeta: Record<DocumentStatus, { label: string; tone: string }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  review: { label: "Em revisão", tone: "warning" },
  published: { label: "Publicado", tone: "success" },
  archived: { label: "Arquivado", tone: "neutral" },
};

export const templates: Record<DocumentType, Omit<DocumentInput, "title" | "author" | "team">> = {
  feature: {
    summary: "Contexto, solução construída, impacto esperado e próximos passos.",
    type: "feature",
    status: "draft",
    tags: ["produto", "entrega"],
    content: `## 01 — Contexto e problema

Descreva o cenário, a dor observada e os sinais quantitativos que justificam esta iniciativa.

:::callout{title="Oportunidade"}
Explique por que este é o momento certo para resolver o problema.
:::

## 02 — O que foi construído

### Fluxo principal

Detalhe a solução e as decisões de produto e engenharia.

### Decisões técnicas

:::cards
- Arquitetura | Decisão principal | Registre a escolha e o motivo técnico.
- Trade-off | Limite aceito | Explique o custo assumido pela solução.
- Integrações | Dependências | Liste sistemas, contratos e responsáveis.
:::

## 03 — Impacto esperado

:::stats
- Conversão | — | Meta a definir | up
- Latência p95 | — | Meta a definir | down
:::

## 04 — Próximos passos

:::checklist
- [ ] Validar com usuários | Responsável · prazo
- [ ] Acompanhar métricas do rollout | Produto + Dados
- [ ] Atualizar documentação operacional | Engenharia
:::`,
  },
  incident: {
    summary: "Postmortem com impacto, linha do tempo, causa raiz e ações preventivas.",
    type: "incident",
    status: "draft",
    tags: ["incidente", "postmortem"],
    content: `## 01 — Resumo executivo

Descreva o que aconteceu, a duração e o estado atual.

## 02 — Impacto

| Indicador | Resultado |
| --- | ---: |
| Usuários afetados | — |
| Duração | — |
| Volume impactado | — |

## 03 — Linha do tempo

:::timeline
- 00:00 | Primeiro alerta | Monitoramento identifica degradação | done
- 00:00 | Investigação iniciada | Time assume o incidente | done
- 00:00 | Causa identificada | Hipótese confirmada | current
- 00:00 | Serviço restaurado | Tráfego normalizado | done
:::

## 04 — Causa raiz

Explique a causa técnica e os fatores contribuintes sem atribuição pessoal de culpa.

## 05 — Ações preventivas

:::checklist
- [ ] Ação, responsável e prazo | Dono · data
- [ ] Alerta ou controle adicional | Observabilidade
- [ ] Atualização do runbook | Operações
:::`,
  },
  report: {
    summary: "Sumário de entregas, métricas, riscos e decisões do período.",
    type: "report",
    status: "draft",
    tags: ["relatório", "entrega"],
    content: `## 01 — Sumário executivo

Registre a leitura mais importante do período em poucas linhas.

## 02 — Entregas

:::steps
- Entrega principal | O que foi entregue, para quem e qual problema resolve.
- Validação | Como a entrega foi testada e quais evidências foram coletadas.
- Rollout | Estratégia de liberação, acompanhamento e reversão.
:::

## 03 — Indicadores

| Indicador | Resultado | Variação | Status |
| --- | ---: | ---: | --- |
| Throughput | — | — | 🟡 |
| Lead time | — | — | 🟢 |

## 04 — Riscos e impedimentos

:::alert{variant="warning" title="Risco do ciclo"}
Registre risco, impacto, probabilidade e plano de mitigação.
:::

## 05 — Próximo ciclo

- Prioridade 1
- Prioridade 2
- Decisão pendente`,
  },
  reference: {
    summary: "Referência de arquitetura, contrato, operação e exemplos técnicos.",
    type: "reference",
    status: "draft",
    tags: ["arquitetura", "referência"],
    content: `## Visão geral

Explique o propósito desta referência e o público esperado.

## Arquitetura

Descreva componentes, responsabilidades e limites do sistema.

:::kv
- Componente | Nome do serviço ou módulo
- Responsabilidade | Limite funcional do componente
- Dependências | Sistemas e contratos relacionados
- Operação | Time responsável e runbook
:::

\`\`\`mermaid
flowchart LR
  Client --> API
  API --> Database
\`\`\`

## Contrato

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | string | sim | Identificador único |

## Exemplo

\`\`\`json
{
  "status": "ok"
}
\`\`\`

## Operação

- Dependências
- Observabilidade
- Runbooks relacionados`,
  },
};
