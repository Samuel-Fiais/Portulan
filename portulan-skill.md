---
name: festpay-docs-mcp
description: Operates the Festpay Docs MCP server (festpay-docs) to list, read, create, update, publish, and delete technical documents in SQLite. Use when the user mentions Festpay Docs MCP, /api/mcp, document library agents, publishing share links, or maintaining Markdown docs via MCP in Cursor or Claude Code.
---

# Festpay Docs MCP

Guia para agentes operarem a biblioteca técnica **Festpay Docs** via MCP Streamable HTTP.

## Pré-requisitos

1. App rodando: `npm run dev` (Node 20+) no repo Festpay Docs
2. Endpoint: `http://localhost:3000/api/mcp`
3. Servidor MCP: `festpay-docs` v0.2.0

Sem o dev server, conexões falham (`CONNECTION_CLOSED`, timeout ou 401).

## Conectar o cliente MCP

### Cursor

No projeto Festpay Docs, use `.cursor/mcp.json`. Em outros workspaces, adicione ao MCP global ou ao `mcp.json` do projeto:

```json
{
  "mcpServers": {
    "festpay-docs": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Recarregue MCPs em Settings → MCP após subir o app.

### Claude Code / Claude Desktop (HTTP)

```json
{
  "mcpServers": {
    "festpay-docs": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Se o cliente só suporta stdio, use `mcp-remote`:

```json
{
  "mcpServers": {
    "festpay-docs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

### Autenticação (opcional)

Se `MCP_API_KEY` estiver em `.env.local`, envie em **toda** requisição:

```http
Authorization: Bearer <MCP_API_KEY>
```

No JSON do cliente, adicione `"headers": { "Authorization": "Bearer ..." }` quando suportado.

## Ferramentas (7)

| Ferramenta | Quando usar |
|---|---|
| `list_documents` | Descobrir o que existe; buscar por título, tag, tipo ou status |
| `get_document` | Ler conteúdo completo antes de editar |
| `create_document` | Assunto novo, sem documento equivalente |
| `update_document` | Editar rascunho/revisão; **incrementa versão** |
| `publish_document` | Gerar link público imutável da versão atual |
| `list_document_releases` | Recuperar links `/p/{id}` já publicados |
| `delete_document` | Remover definitivamente (só UUID) |

Respostas são JSON em `content[0].text`. Erros usam `isError: true`.

## Modelo de dados

### Tipos (`type`)

| Valor | Uso |
|---|---|
| `feature` | Nova feature / rollout |
| `incident` | Postmortem / incidente |
| `report` | Relatório de sprint/ciclo |
| `reference` | Referência técnica / arquitetura |

### Status (`status`)

| Valor | Significado |
|---|---|
| `draft` | Rascunho |
| `review` | Em revisão |
| `published` | Publicado na biblioteca |
| `archived` | Arquivado |

### Versão e publicação

- `update_document` sempre incrementa `version` quando há mudança de conteúdo/metadados.
- `publish_document` cria snapshot imutável em `document_releases` e retorna `publicPath: "/p/{releaseId}"`.
- Links antigos **não mudam** quando o documento é editado depois; nova publicação = novo link.
- Link público: `http://localhost:3000/p/{releaseId}` (fundo branco, conteúdo centralizado).

### Identificadores

- `get_document`, `list_document_releases`, `publish_document`: aceitam **ID UUID ou slug**.
- `delete_document`: exige **UUID** (`id` do documento).
- Após `create_document`, guarde o `id` retornado.

## Fluxos recomendados

### Criar documento novo

```
1. list_documents (query opcional) → confirmar que não existe equivalente
2. create_document → type + title + content (+ summary, tags, author, team)
3. publish_document (se link compartilhável for necessário)
```

Prefira `type` coerente com o template em `lib/documents.ts` (`templates`).

### Atualizar existente

```
1. get_document(id ou slug)
2. update_document(id, campos alterados)
3. publish_document(id) → se precisar de link da nova versão
```

**Regra:** prefira `update_document` em documento existente; não duplique com `create_document`.

### Publicar para compartilhar

```
1. Garantir conteúdo final (update_document se necessário)
2. publish_document(id)
3. Montar URL: {origin}/p/{release.id}
4. list_document_releases(id) → ver histórico de versões publicadas
```

### Excluir

```
delete_document(id: "<uuid>")
```

Irreversível. Confirme com o usuário antes.

### Escolha do componente certo

| Conteúdo | Use |
|---|---|
| Tarefas com status (feito/pendente) | `:::checklist` com `- [ ]` / `- [x]` |
| Critérios, sintomas, “quando escalar” | bullets Markdown (`- item`) |
| Passos sequenciais | `:::steps` |
| Cronologia de eventos | `:::timeline` |
| Métricas numéricas | `:::stats` |

## Conteúdo Markdown

Documentos usam Markdown + diretivas `:::nome`. Seções com `## Título` viram blocos editoriais.

Diretivas suportadas:

| Diretiva | Formato do corpo |
|---|---|
| `:::alert{variant="info" title="..."}` | Markdown livre |
| `:::callout{title="..."}` | Markdown livre |
| `:::banner{title="..."}` | Markdown livre |
| `:::stats` | `- Label \| valor \| delta \| up\|down` por linha |
| `:::cards` | `- eyebrow \| título \| corpo` |
| `:::steps` | `- título \| corpo` |
| `:::timeline` | `- data \| título \| corpo \| done\|current` |
| `:::checklist` | Tarefas rastreáveis com `- [ ]` ou `- [x]` · subtítulo opcional após `\|` |

**Quando NÃO usar `:::checklist`:** critérios, sintomas, condições ou listas informativas (“quando escalar”, “sinais de alerta”) → use bullets Markdown normais (`- item`) no corpo da seção, **não** dentro de `:::checklist`. O `-` vira lista com marcador; checkbox só com `[ ]` / `[x]`.

**Stats:** se não houver delta, omita a terceira coluna — não use `-` como placeholder (`- Label | valor` basta).
| `:::kv` | `- chave \| valor` |
| `:::progress` | `- label \| 0-100 \| ok\|warn\|err\|a2` |

Variantes de alert: `info`, `success`, `warning`, `error`, `accent`.

Também suportados: tabelas GFM, blocos de código, links, negrito/itálico.

Exemplo mínimo:

```markdown
## 01 — Contexto

Texto introdutório.

:::alert{variant="info" title="Nota"}
Informação relevante.
:::

:::stats
- Indicador | 42 | ↑ 12% | up
:::
```

## Validação (limites)

| Campo | Limite |
|---|---|
| `title` | 3–180 chars |
| `summary` | 500 chars |
| `author`, `team` | 100 chars |
| `tags` | até 12, cada tag 1–40 chars |
| `content` | 250.000 chars |

## Diagnóstico rápido

| Sintoma | Causa provável | Ação |
|---|---|---|
| `CONNECTION_CLOSED` | App parado | `npm run dev` |
| `401 Não autorizado` | `MCP_API_KEY` ativa | Header Bearer ou remova a chave em dev |
| `Documento não encontrado` | ID/slug errado | `list_documents` |
| Ferramentas não aparecem | MCP desconectado | Reiniciar cliente / refresh MCP |
| `delete_document` falha | Slug em vez de UUID | Use `document.id` de `get_document` |

Teste manual:

```bash
curl -sS -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Deve listar 7 ferramentas.

## API HTTP (alternativa ao MCP)

Mesma base SQLite, sem MCP:

- `GET /api/documents?q=&type=&status=`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`

Use MCP quando o agente precisa de ferramentas tipadas; use HTTP para integrações custom.

---

# Festpay Docs MCP — Referência

## Implementação no projeto

| Item | Caminho |
|---|---|
| Handler MCP | `app/api/mcp/route.ts` |
| Banco SQLite | `lib/db.ts` → `data/festpay-docs.sqlite` |
| Tipos e templates | `lib/documents.ts` |
| Validação Zod | `lib/validation.ts` |
| Config Cursor | `.cursor/mcp.json` |
| Página pública | `app/p/[releaseId]/page.tsx` |

Variáveis de ambiente (`.env.example`):

```dotenv
DATABASE_PATH=
MCP_API_KEY=
```

## Ferramentas — schemas e exemplos

### `list_documents`

**Input (todos opcionais):**

```json
{
  "query": "webhook",
  "type": "incident",
  "status": "published"
}
```

**Output:**

```json
{
  "documents": [
    {
      "id": "uuid",
      "slug": "inc-2024-08-falha-no-webhook",
      "title": "...",
      "summary": "...",
      "type": "incident",
      "status": "review",
      "author": "...",
      "team": "...",
      "tags": ["webhook"],
      "version": 3,
      "createdAt": "ISO",
      "updatedAt": "ISO",
      "publishedAt": null
    }
  ]
}
```

Lista não inclui `content` (use `get_document`).

### `get_document`

**Input:**

```json
{ "id": "checkout-recorrente-via-pix" }
```

Aceita UUID ou slug. **Output:** objeto `document` completo com `content`.

### `create_document`

**Input (obrigatório: `title`, `type`):**

```json
{
  "title": "Relatório de estabilidade — março",
  "summary": "Resumo executivo do período.",
  "type": "report",
  "status": "draft",
  "author": "Agente de IA",
  "team": "Festlab",
  "tags": ["estabilidade", "sre"],
  "content": "## 01 — Sumário\n\nConteúdo..."
}
```

**Output:** `{ "document": { ... } }` com `version: 1`.

### `update_document`

**Input (obrigatório: `id`; demais opcionais):**

```json
{
  "id": "uuid-do-documento",
  "content": "## 01 — Atualizado\n\nNovo texto.",
  "status": "review"
}
```

Incrementa `version` a cada alteração persistida.

### `publish_document`

**Input:**

```json
{
  "id": "uuid-ou-slug",
  "content": "opcional — publica já com alterações pendentes"
}
```

**Output:**

```json
{
  "document": { "...": "status published" },
  "release": {
    "id": "uuid-release",
    "documentId": "uuid-doc",
    "version": 4,
    "title": "...",
    "publishedAt": "ISO"
  },
  "publicPath": "/p/uuid-release"
}
```

URL completa em dev: `http://localhost:3000/p/{release.id}`

### `list_document_releases`

**Input:** `{ "id": "uuid-ou-slug" }`

**Output:** `{ "documentId": "uuid", "releases": [{ "id", "version", "publishedAt", "publicPath" }] }`

### `delete_document`

**Input:** `{ "id": "550e8400-e29b-41d4-a716-446655440000" }` (apenas UUID)

**Output:** `{ "deleted": true, "id": "..." }`

## Templates por tipo

Copie estrutura de `lib/documents.ts` → `templates` ao criar documentos.

- **feature** — Contexto, O que foi construído, Impacto, Próximos passos (`callout`, `cards`, `stats`, `checklist`)
- **incident** — Resumo, Impacto, Timeline, Causa raiz, Ações (`stats`, `timeline`, `alert`, `checklist`, `kv`)
- **report** — Sumário, Entregas, Indicadores, Riscos, Próximo ciclo (`steps`, `stats`, `alert`, `progress`)
- **reference** — Visão geral, Arquitetura, Contrato, Exemplo, Operação (`kv`, código, mermaid)

## Diretivas — sintaxe completa

Abrir com `:::nome{attr="valor"}`, fechar com `:::` sozinho em linha.

```
:::alert{variant="warning" title="Atenção"}
Corpo em Markdown.
:::

:::callout{title="Oportunidade"}
Texto do callout.
:::

:::banner{title="Mensagem principal"}
Texto do banner.
:::

:::stats
- Label | 500 | ↑ meta | up
:::

:::cards
- Eyebrow | Título | Descrição.
:::

:::steps
- Título do passo | Descrição.
:::

:::timeline
- 18h12 | Alerta | Detalhe | done
:::

:::checklist
- [x] Concluído | Responsável · prazo
- [ ] Pendente | Dono · data
:::

:::kv
- Chave | Valor
:::

:::progress
- Implementação | 82 |
- Cobertura | 91 | ok
:::
```

## Protocolo MCP

- Transporte: Streamable HTTP (POST/GET/DELETE em `/api/mcp`)
- Spec: MCP SDK v2 via `mcp-handler`
- Initialize retorna `serverInfo.name: "festpay-docs"`

## Erros comuns do agente

1. **Duplicar documentos** — sempre `list_documents` + `get_document` antes de `create_document`.
2. **Esperar link sem publicar** — `update_document` com `status: "published"` não gera `/p/{id}`; use `publish_document`.
3. **Editar link antigo** — releases são imutáveis; publique nova versão para novo link.
4. **Slug no delete** — `delete_document` rejeita slug; use UUID.
5. **Conteúdo sem `##`** — diretivas funcionam, mas seções editoriais ficam melhor com `## 01 — Título`.

## Instalação como Cursor Skill

Copie para `~/.cursor/skills/festpay-docs-mcp/SKILL.md` (global) ou `.cursor/skills/festpay-docs-mcp/SKILL.md` (projeto).
