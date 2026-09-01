import "server-only";

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync, accessSync, constants } from "node:fs";
import path from "node:path";
import type { DocumentInput, DocumentRecord, DocumentRelease, DocumentStatus, DocumentType } from "@/lib/documents";

type DocumentRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: DocumentType;
  status: DocumentStatus;
  author: string;
  team: string;
  tags: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type DocumentReleaseRow = {
  id: string;
  document_id: string;
  version: number;
  title: string;
  summary: string;
  type: DocumentType;
  author: string;
  team: string;
  tags: string;
  content: string;
  published_at: string;
};

// Determine the database path
// On Vercel (or other serverless with read-only filesystem), use /tmp (ephemeral)
// In development, use ./data (persistent)
function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Check if current working directory is writable
  const cwd = process.cwd();
  let isWritable = false;
  try {
    accessSync(cwd, constants.W_OK);
    isWritable = true;
  } catch {
    isWritable = false;
  }

  if (isWritable) {
    // Development: prefer ./data/portulan.sqlite, fallback to legacy festpay-docs.sqlite
    const legacyPath = path.join(cwd, "data", "festpay-docs.sqlite");
    const newPath = path.join(cwd, "data", "portulan.sqlite");
    try {
      if (existsSync(legacyPath)) return legacyPath;
    } catch {}
    return newPath;
  } else {
    // Production/serverless: use /tmp (ephemeral but writable)
    return path.join("/tmp", "portulan.sqlite");
  }
}

const databasePath = getDatabasePath();

// Ensure the directory exists (only if parent is writable)
try {
  mkdirSync(path.dirname(databasePath), { recursive: true });
} catch (error) {
  console.warn(`Could not create database directory: ${error}`);
}

const globalForDb = globalThis as unknown as { portulanDb?: Database.Database };
const db = globalForDb.portulanDb ?? new Database(databasePath);

globalForDb.portulanDb = db;

db.pragma("busy_timeout = 10000");
if (db.pragma("journal_mode", { simple: true }) !== "wal") {
  db.pragma("journal_mode = WAL");
}
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK(type IN ('feature', 'incident', 'report', 'reference')),
    status TEXT NOT NULL CHECK(status IN ('draft', 'review', 'published', 'archived')),
    author TEXT NOT NULL DEFAULT '',
    team TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE TABLE IF NOT EXISTS document_releases (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK(type IN ('feature', 'incident', 'report', 'reference')),
    author TEXT NOT NULL DEFAULT '',
    team TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL DEFAULT '',
    published_at TEXT NOT NULL,
    UNIQUE(document_id, version)
  );
  CREATE INDEX IF NOT EXISTS idx_document_releases_document ON document_releases(document_id, version DESC);
`);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

function uniqueSlug(title: string, currentId?: string) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  const lookup = db.prepare("SELECT id FROM documents WHERE slug = ?");
  while (true) {
    const match = lookup.get(slug) as { id: string } | undefined;
    if (!match || match.id === currentId) return slug;
    slug = `${base}-${suffix++}`;
  }
}

function mapRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type,
    status: row.status,
    author: row.author,
    team: row.team,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function listDocuments(filters?: { query?: string; type?: DocumentType; status?: DocumentStatus }) {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filters?.query) {
    clauses.push("(title LIKE ? OR summary LIKE ? OR tags LIKE ?)");
    const query = `%${filters.query}%`;
    params.push(query, query, query);
  }
  if (filters?.type) {
    clauses.push("type = ?");
    params.push(filters.type);
  }
  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM documents ${where} ORDER BY updated_at DESC`).all(...params) as DocumentRow[];
  return rows.map(mapRow);
}

function mapReleaseRow(row: DocumentReleaseRow): DocumentRelease {
  return {
    id: row.id,
    documentId: row.document_id,
    version: row.version,
    title: row.title,
    summary: row.summary,
    type: row.type,
    author: row.author,
    team: row.team,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    publishedAt: row.published_at,
  };
}

export function getDocument(idOrSlug: string) {
  const row = db.prepare("SELECT * FROM documents WHERE id = ? OR slug = ?").get(idOrSlug, idOrSlug) as DocumentRow | undefined;
  return row ? mapRow(row) : null;
}

export function createDocument(input: DocumentInput, options?: { id?: string; slug?: string }) {
  const id = options?.id ?? randomUUID();
  const now = new Date().toISOString();
  const slug = options?.slug ?? uniqueSlug(input.title, id);
  const publishedAt = input.status === "published" ? now : null;
  db.prepare(`
    INSERT INTO documents (id, slug, title, summary, type, status, author, team, tags, content, version, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(id, slug, input.title, input.summary, input.type, input.status, input.author, input.team, JSON.stringify(input.tags), input.content, now, now, publishedAt);
  return getDocument(id)!;
}

export function updateDocument(id: string, input: Partial<DocumentInput>) {
  const current = getDocument(id);
  if (!current) return null;
  const next = { ...current, ...input };
  const now = new Date().toISOString();
  const publishedAt = next.status === "published" ? current.publishedAt ?? now : null;
  const slug = input.title ? uniqueSlug(input.title, id) : current.slug;
  db.prepare(`
    UPDATE documents SET slug = ?, title = ?, summary = ?, type = ?, status = ?, author = ?, team = ?, tags = ?, content = ?,
      version = version + 1, updated_at = ?, published_at = ? WHERE id = ?
  `).run(slug, next.title, next.summary, next.type, next.status, next.author, next.team, JSON.stringify(next.tags), next.content, now, publishedAt, id);
  return getDocument(id);
}

export function deleteDocument(id: string) {
  return db.prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
}

function documentContentChanged(current: DocumentRecord, input: Partial<DocumentInput>) {
  const title = input.title ?? current.title;
  const summary = input.summary ?? current.summary;
  const type = input.type ?? current.type;
  const author = input.author ?? current.author;
  const team = input.team ?? current.team;
  const tags = input.tags ?? current.tags;
  const content = input.content ?? current.content;
  return (
    title !== current.title ||
    summary !== current.summary ||
    type !== current.type ||
    author !== current.author ||
    team !== current.team ||
    JSON.stringify(tags) !== JSON.stringify(current.tags) ||
    content !== current.content
  );
}

export function getDocumentRelease(releaseId: string) {
  const row = db.prepare("SELECT * FROM document_releases WHERE id = ?").get(releaseId) as DocumentReleaseRow | undefined;
  return row ? mapReleaseRow(row) : null;
}

export function listDocumentReleases(documentId: string) {
  const rows = db
    .prepare("SELECT * FROM document_releases WHERE document_id = ? ORDER BY version DESC")
    .all(documentId) as DocumentReleaseRow[];
  return rows.map(mapReleaseRow);
}

export function publishDocument(id: string, input: Partial<DocumentInput> = {}) {
  const publish = db.transaction(() => {
    const current = getDocument(id);
    if (!current) return null;

    const merged = {
      title: input.title ?? current.title,
      summary: input.summary ?? current.summary,
      type: input.type ?? current.type,
      author: input.author ?? current.author,
      team: input.team ?? current.team,
      tags: input.tags ?? current.tags,
      content: input.content ?? current.content,
    };

    const now = new Date().toISOString();
    const changed = documentContentChanged(current, input);

    if (changed) {
      const slug = input.title ? uniqueSlug(input.title, id) : current.slug;
      db.prepare(`
        UPDATE documents
        SET slug = ?, title = ?, summary = ?, type = ?, status = 'published', author = ?, team = ?, tags = ?, content = ?,
            version = version + 1, updated_at = ?, published_at = COALESCE(published_at, ?)
        WHERE id = ?
      `).run(
        slug,
        merged.title,
        merged.summary,
        merged.type,
        merged.author,
        merged.team,
        JSON.stringify(merged.tags),
        merged.content,
        now,
        now,
        id,
      );
    } else {
      db.prepare(`
        UPDATE documents
        SET status = 'published', updated_at = ?, published_at = COALESCE(published_at, ?)
        WHERE id = ?
      `).run(now, now, id);
    }

    const document = getDocument(id)!;
    const existing = db
      .prepare("SELECT * FROM document_releases WHERE document_id = ? AND version = ?")
      .get(id, document.version) as DocumentReleaseRow | undefined;
    if (existing) return { document, release: mapReleaseRow(existing) };

    const releaseId = randomUUID();
    db.prepare(`
      INSERT INTO document_releases (id, document_id, version, title, summary, type, author, team, tags, content, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      releaseId,
      id,
      document.version,
      document.title,
      document.summary,
      document.type,
      document.author,
      document.team,
      JSON.stringify(document.tags),
      document.content,
      now,
    );

    return { document, release: getDocumentRelease(releaseId)! };
  });

  return publish();
}

export function getDocumentStats() {
  const result = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS review,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft
    FROM documents
  `).get() as { total: number; published: number | null; review: number | null; draft: number | null };
  return { total: result.total, published: result.published ?? 0, review: result.review ?? 0, draft: result.draft ?? 0 };
}

const SEED_DOCUMENTS = [
  {
    id: "seed-checkout-recorrente-via-pix",
    slug: "checkout-recorrente-via-pix",
    title: "Checkout Recorrente via Pix",
    summary: "Rollout do novo fluxo de cobranças automáticas via Pix para clientes com planos recorrentes.",
    type: "feature",
    status: "published",
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
    type: "incident",
    status: "review",
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
    type: "report",
    status: "draft",
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

const seedDatabase = db.transaction(() => {
  const count = (db.prepare("SELECT COUNT(*) AS count FROM documents").get() as { count: number }).count;
  if (count > 0) return;

  for (const seed of SEED_DOCUMENTS) {
    const { id, slug, ...input } = seed;
    createDocument({ ...input, tags: [...input.tags] }, { id, slug });
  }
});

seedDatabase.immediate();

const upgradeBundledExamples = db.transaction(() => {
  const featureContent = `## 01 — Contexto e problema

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

  db.prepare(`
    UPDATE documents SET content = ?
    WHERE slug = 'checkout-recorrente-via-pix' AND version = 1 AND content NOT LIKE '%:::steps%'
  `).run(featureContent);

  const incidentContent = `## 01 — Impacto

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

  db.prepare(`
    UPDATE documents SET content = ?
    WHERE slug = 'inc-2024-08-falha-no-webhook-de-pagamentos' AND version = 1 AND content NOT LIKE '%:::timeline%'
  `).run(incidentContent);

  const reportContent = `## 01 — Métricas do período

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

  db.prepare(`
    UPDATE documents SET content = ?
    WHERE slug = 'sprint-32-plataforma-de-pagamentos' AND version = 1 AND content NOT LIKE '%:::stats%'
  `).run(reportContent);
});

upgradeBundledExamples.immediate();

const ensureComponentCatalog = db.transaction(() => {
  if (getDocument("catalogo-de-componentes-qa-visual")) return;
  createDocument({
    title: "Catálogo de componentes — QA visual",
    summary: "Documento de referência para validar hierarquia, espaçamento e renderização de todos os componentes disponíveis no Portulan.",
    type: "reference",
    status: "draft",
    author: "Portulan Design System",
    team: "Plataforma",
    tags: ["qa", "design-system", "componentes"],
    content: `## 01 — Texto e hierarquia

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

Texto final para validar o espaçamento depois de um bloco de código.`,
  }, {
    id: "seed-catalogo-componentes-qa-visual",
    slug: "catalogo-de-componentes-qa-visual",
  });
});

ensureComponentCatalog.immediate();

export { db, databasePath };
