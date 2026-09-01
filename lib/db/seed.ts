import "server-only";

import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { documents } from "@/lib/db/schema";
import type { DocumentInput } from "@/lib/documents";
import * as schema from "@/lib/db/schema";

type Db = NeonHttpDatabase<typeof schema>;

export const SEED_DOCUMENTS = [
  {
    id: "seed-checkout-recorrente-via-pix",
    slug: "checkout-recorrente-via-pix",
    title: "Checkout Recorrente via Pix",
    summary: "Rollout do novo fluxo de cobranças automáticas via Pix para clientes com planos recorrentes.",
    type: "feature" as const,
    status: "published" as const,
    author: "Rafaela Costa",
    team: "Payments Core",
    tags: ["pix", "checkout", "rollout"],
    content: `## 01 — Contexto e problema

Clientes com planos mensais precisavam repetir o pagamento manual todo mês, gerando **18% de inadimplência por esquecimento** e cerca de 200 tickets mensais para o time de atendimento.

> **Oportunidade**  
> O Pix Automático permite reduzir fricção sem adicionar dependência de cartão de crédito.

## 02 — O que foi construído

### Adesão em uma etapa

O cliente autoriza o mandato uma única vez por QR Code. As cobranças seguintes são realizadas automaticamente na data configurada.

### Resiliência operacional

- Retry automático em 24h, 48h e 72h
- Notificações em D-3, D-1 e D0
- Cancelamento e pausa diretamente pelo aplicativo

## 03 — Impacto esperado

| Indicador | Base | Meta do rollout |
| --- | ---: | ---: |
| Contratos ativos | 50 | 500 |
| Volume mensal | R$ 120 mil | R$ 1,2 mi |
| Inadimplência | 18% | 7% |
| NPS do piloto | — | 87 |

## 04 — Próximos passos

- [x] Piloto com 50 clientes beta
- [x] Dashboard de mandatos
- [ ] Rollout para 10% da base
- [ ] Documentação no portal do cliente`,
  },
  {
    id: "seed-inc-2024-08-webhook",
    slug: "inc-2024-08-falha-no-webhook-de-pagamentos",
    title: "INC-2024-08 · Falha no Webhook de Pagamentos",
    summary: "Postmortem do timeout no parceiro bancário que afetou confirmações em tempo real por 47 minutos.",
    type: "incident" as const,
    status: "review" as const,
    author: "Bruno Mendes",
    team: "SRE",
    tags: ["webhook", "p1", "postmortem"],
    content: `## 01 — Resumo executivo

Uma expiração de certificado no parceiro bancário interrompeu a confirmação de pagamentos em tempo real por **47 minutos**. Todas as transações foram reprocessadas, sem perda financeira final.

## 02 — Impacto

| Indicador | Resultado |
| --- | ---: |
| Transações afetadas | 2.347 |
| Volume retido | R$ 89 mil |
| Clientes afetados | 312 |

## 03 — Linha do tempo

- **18:12** — Alertas de latência disparados
- **18:19** — Engenharia iniciou investigação
- **18:31** — Causa raiz identificada
- **18:47** — Fallback ativado
- **18:59** — Serviço restaurado

## 04 — Causa raiz

O certificado TLS do endpoint do parceiro expirou sem alerta prévio. A ausência de circuit breaker fez com que os timeouts continuassem consumindo conexões.

## 05 — Ações preventivas

- [x] Circuit breaker no Webhook Dispatcher
- [x] Alerta de latência p95 acima de 2s
- [ ] Monitor de expiração de certificados em D-30
- [ ] Atualizar runbook de incidentes`,
  },
  {
    id: "seed-sprint-32-plataforma",
    slug: "sprint-32-plataforma-de-pagamentos",
    title: "Sprint 32 — Plataforma de Pagamentos",
    summary: "Entregas, indicadores de performance e riscos do ciclo finalizado em 26 de agosto.",
    type: "report" as const,
    status: "draft" as const,
    author: "Samuel Fiais",
    team: "Payments Core",
    tags: ["sprint", "entrega", "métricas"],
    content: `## 01 — Sumário executivo

O time concluiu 92% do escopo planejado, com redução de 14% no lead time e nenhuma regressão crítica em produção.

## 02 — Entregas

- Checkout recorrente via Pix em piloto controlado
- Circuit breaker do Webhook Dispatcher
- Novo painel de conciliação para operações

## 03 — Indicadores

| Indicador | Resultado | Variação | Status |
| --- | ---: | ---: | --- |
| Throughput | 23 itens | +12% | 🟢 |
| Lead time | 4,2 dias | -14% | 🟢 |
| Bugs escapados | 2 | -33% | 🟢 |
| Cobertura | 81% | +2 pp | 🟡 |

## 04 — Riscos e impedimentos

> A homologação do parceiro Alfa segue como risco para a expansão do Pix. Mitigação: manter o rollout em 10% até a conclusão dos testes de carga.

## 05 — Próximo ciclo

- Expandir observabilidade do fluxo de pagamentos
- Concluir documentação para clientes
- Preparar rollout para 50% da base`,
  },
] as const;

const FEATURE_CONTENT = `## 01 — Contexto e problema

Clientes com planos mensais precisavam repetir o processo de pagamento manual todo mês via boleto ou TED, gerando alta taxa de inadimplência por esquecimento (**18% em ago/2024**). O time de CS recebia cerca de 200 tickets por mês relacionados a cobranças vencidas.

:::callout{title="Oportunidade"}
Com a consolidação do Pix no Brasil, criar um fluxo de débito automático via Pix recorrente endereça o problema sem adicionar fricção ao usuário.
:::

## 02 — O que foi construído

:::steps
- Fluxo de adesão via QR Code | O cliente escaneia um QR Code de autorização uma única vez. O Portulan armazena a permissão e realiza as cobranças subsequentes automaticamente na data configurada.
- Retry automático com backoff | Em caso de falha, o sistema tenta novamente em 24h, 48h e 72h antes de notificar o cliente. Taxa de sucesso esperada no retry: 78%.
- Notificações e gestão de mandato | Push + email D-3, D-1 e D0. O cliente pode cancelar ou pausar o mandato a qualquer momento pelo app, sem precisar falar com o suporte.
:::

## 03 — Impacto esperado

:::stats
- Contratos ativos (meta) | 500 | ↑ até dez/2024 | up
- Volume mensal estimado | R$ 1,2M | ↑ vs. média boleto | up
- Redução inadimplência | -60% | ↑ projeção S36 | up
- NPS piloto | 87 | ↑ acima da meta | up
:::

## 04 — Próximos passos

:::checklist
- [x] Piloto com 50 clientes beta | Concluído · Sprint 35 · Rafaela, Bruno
- [x] Dashboard de acompanhamento de mandatos | Concluído · FP-1089 · Rafaela
- [ ] Rollout para 10% da base (A/B test) | Em andamento · Sprint 36 · Bruno
- [ ] Documentação no portal do cliente | Pendente · Sprint 36 · CS
- [ ] Rollout completo — 01 out 2024 | Pendente · meta: 500 contratos até dez
:::`;

const INCIDENT_CONTENT = `## 01 — Impacto

:::stats
- Transações afetadas | 2.347 | ↓ sem confirmação | down
- Volume retido | R$ 89k | ↓ pendente retry | down
- Clientes afetados | 312 | ↓ notificados | down
- SLA de resolução | 47 min | ↑ dentro do P1 SLA | up
:::

:::alert{variant="error" title="Impacto em receita"}
R$ 89k em volume de pagamentos ficou pendente de confirmação. Todas as transações foram reprocessadas com sucesso via retry automático — sem perda financeira final.
:::

## 02 — Linha do tempo

:::timeline
- 18h12 | Alertas de latência disparados | P95 do webhook acima de 8s. PagerDuty acionado. | done
- 18h19 | Engenharia notificada | Logs apontavam timeouts no parceiro bancário Alfa. | done
- 18h31 | Root cause identificado | Certificado TLS expirado no endpoint /notify. | done
- 18h47 | Fallback ativado | Tráfego redirecionado para o endpoint secundário. | done
- 18h59 | Serviço restaurado | 100% dos webhooks voltaram a funcionar. | done
:::

## 03 — Causa raiz

:::kv
- Componente | Webhook Dispatcher — Parceiro Bancário Alfa
- Trigger | Certificado TLS do endpoint /notify expirou sem alerta prévio
- Falha de controle | Ausência de circuit breaker e monitor de certificados
- Contribuinte | Timeout silencioso sem fallback automático
:::

## 04 — Ações preventivas

:::checklist
- [x] Circuit breaker no Webhook Dispatcher | FP-1101 · Concluído · Bruno
- [x] Alerta de latência p95 acima de 2s | FP-1102 · Concluído · SRE
- [ ] Monitor de certificados em D-30 | FP-1103 · Em andamento · Plataforma
- [ ] Runbook de incidentes atualizado | FP-1104 · Pendente · Bruno
:::`;

const REPORT_CONTENT = `## 01 — Métricas do período

:::stats
- Stories entregues | 18/22 | ↓ 4 movidas p/ S33 | down
- Bugs resolvidos | 7 | ↑ todos críticos | up
- Cobertura de testes | 84% | ↑ 6pp vs. S31 | up
- Disponibilidade | 99,97% | ↑ no SLA | up
:::

## 02 — Entregas concluídas

:::checklist
- [x] Checkout em 1 clique (Pix + cartão) | FP-1021 · Alta prioridade · Rafaela, Bruno
- [x] Webhook de estorno automático | FP-1034 · Média prioridade · Bruno
- [x] Dashboard de métricas em tempo real | FP-1041 · Alta prioridade · Rafaela
- [ ] Migração para API v3 | FP-1052 · Movido para S33 · Dependência externa
:::

## 03 — Progresso do sprint

:::progress
- Stories concluídas | 82 | 
- Cobertura de testes | 84 | ok
- Bugs críticos zerados | 100 | a2
:::

## 04 — Impedimentos

:::alert{variant="warning" title="Dependência externa bloqueando FP-1052"}
A migração para API v3 depende da certificação do parceiro bancário prevista para setembro. O item foi movido para a Sprint 33.
:::`;

const CATALOG_CONTENT = `## 01 — Texto e hierarquia

Este parágrafo valida **negrito**, *itálico*, [link](https://portulan.com) e \`código inline\` dentro do fluxo editorial.

### Subtítulo com respiro

O subtítulo deve começar um novo grupo visual sem se desconectar do conteúdo que apresenta.

- Primeiro item de uma lista
- Segundo item com **ênfase**
- Terceiro item para validar o ritmo vertical

> Bloco de citação em Markdown padrão para comparar com os componentes especiais.

## 02 — Alertas e destaques

:::alert{variant="info" title="Informação"}
Mensagem informativa com contexto suficiente para validar duas linhas de conteúdo.
:::

:::alert{variant="success" title="Operação concluída"}
O processamento terminou sem pendências.
:::

:::alert{variant="warning" title="Atenção necessária"}
Existe uma decisão que precisa ser tomada antes do rollout.
:::

:::alert{variant="error" title="Falha crítica"}
O fluxo foi interrompido e exige intervenção.
:::

:::alert{variant="accent" title="Destaque editorial"}
Informação vinculada ao tema visual do documento.
:::

:::callout{title="Oportunidade"}
Callout neutro para decisões, hipóteses e observações importantes.
:::

:::banner{title="Mensagem principal"}
Banner de alto contraste para comunicar uma conclusão prioritária.
:::

## 03 — Indicadores e progresso

:::stats
- Contratos ativos | 500 | ↑ 18% no período | up
- Inadimplência | 7% | ↓ 11 p.p. | up
- Latência p95 | 1,2s | ↓ 38% | up
- Erros críticos | 0,08% | acima do limite | down
:::

:::progress
- Implementação | 82 | 
- Cobertura de testes | 91 | ok
- Orçamento consumido | 68 | warn
- Risco residual | 24 | err
:::

## 04 — Etapas

:::steps
- Descoberta | Contexto, restrições e objetivo foram documentados.
- Implementação | O fluxo principal foi construído e instrumentado.
- Validação | Testes funcionais e visuais foram concluídos.
- Rollout | Liberação gradual com monitoramento e reversão.
:::

## 05 — Cards

:::cards
- Produto | Checkout recorrente | Jornada compacta e orientada à conclusão.
- Plataforma | Orquestração resiliente | Retentativas, circuit breaker e auditoria.
- Operação | Monitoramento ativo | Métricas, alertas e runbooks ligados aos eventos.
:::

## 06 — Linha do tempo

:::timeline
- 18h12 | Alertas disparados | Latência p95 ultrapassou o limite operacional. | done
- 18h19 | Investigação iniciada | Engenharia correlacionou falhas no parceiro. | done
- 18h31 | Causa confirmada | Certificado expirado foi identificado. | current
- 18h47 | Serviço restaurado | Tráfego normalizado pelo endpoint secundário. | done
:::

## 07 — Checklist

:::checklist
- [x] Contrato revisado | Concluído · Produto
- [x] Testes automatizados | Concluído · Engenharia
- [ ] Documentação operacional | Em andamento · Plataforma
- [ ] Rollout completo | Pendente · Operações
:::

## 08 — Chave e valor

:::kv
- Componente | Webhook Dispatcher
- Responsabilidade | Entrega resiliente de eventos
- Dependências | Parceiro bancário, fila e observabilidade
- Operação | Payments Core
:::

## 09 — Tabela

| Indicador | Resultado | Variação | Status |
| --- | ---: | ---: | --- |
| Throughput | 23 itens | +12% | Saudável |
| Lead time | 4,2 dias | -14% | Saudável |
| Cobertura | 81% | +2 p.p. | Atenção |

## 10 — Código

\`\`\`json
{
  "event": "payment.confirmed",
  "status": "processed",
  "retry": 0
}
\`\`\`

Texto final para validar o espaçamento depois de um bloco de código.`;

async function insertSeedDocument(
  db: Db,
  input: DocumentInput,
  options: { id?: string; slug?: string },
) {
  const id = options.id ?? randomUUID();
  const now = new Date().toISOString();
  const slug = options.slug ?? slugify(input.title);
  const publishedAt = input.status === "published" ? now : null;

  await db.insert(documents).values({
    id,
    slug,
    title: input.title,
    summary: input.summary,
    type: input.type,
    status: input.status,
    author: input.author,
    team: input.team,
    tags: JSON.stringify(input.tags),
    content: input.content,
    version: 1,
    userId: null,
    createdAt: now,
    updatedAt: now,
    publishedAt,
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

export async function seedDatabaseIfEmpty(db: Db) {
  const [{ value: total }] = await db.select({ value: count() }).from(documents);
  if (total > 0) {
    await upgradeBundledExamples(db);
    await ensureComponentCatalog(db);
    return;
  }

  for (const seed of SEED_DOCUMENTS) {
    const { id, slug, ...input } = seed;
    await insertSeedDocument(db, { ...input, tags: [...input.tags] }, { id, slug });
  }

  await upgradeBundledExamples(db);
  await ensureComponentCatalog(db);
}

async function upgradeBundledExamples(db: Db) {

  const [feature] = await db.select().from(documents).where(eq(documents.slug, "checkout-recorrente-via-pix")).limit(1);
  if (feature && feature.version === 1 && !feature.content.includes(":::steps")) {
    await db.update(documents).set({ content: FEATURE_CONTENT }).where(eq(documents.id, feature.id));
  }

  const [incident] = await db
    .select()
    .from(documents)
    .where(eq(documents.slug, "inc-2024-08-falha-no-webhook-de-pagamentos"))
    .limit(1);
  if (incident && incident.version === 1 && !incident.content.includes(":::timeline")) {
    await db.update(documents).set({ content: INCIDENT_CONTENT }).where(eq(documents.id, incident.id));
  }

  const [report] = await db
    .select()
    .from(documents)
    .where(eq(documents.slug, "sprint-32-plataforma-de-pagamentos"))
    .limit(1);
  if (report && report.version === 1 && !report.content.includes(":::stats")) {
    await db.update(documents).set({ content: REPORT_CONTENT }).where(eq(documents.id, report.id));
  }
}

async function ensureComponentCatalog(db: Db) {
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.slug, "catalogo-de-componentes-qa-visual"))
    .limit(1);
  if (existing) return;

  await insertSeedDocument(db, {
      title: "Catálogo de componentes — QA visual",
      summary: "Documento de referência para validar hierarquia, espaçamento e renderização de todos os componentes disponíveis no Portulan.",
      type: "reference",
      status: "draft",
      author: "Portulan Design System",
      team: "Plataforma",
      tags: ["qa", "design-system", "componentes"],
      content: CATALOG_CONTENT,
    },
    {
      id: "seed-catalogo-componentes-qa-visual",
      slug: "catalogo-de-componentes-qa-visual",
    },
  );
}
