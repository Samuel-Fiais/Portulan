---
name: portulan-mcp
description: Operates the Portulan MCP server (portulan) to list, read, create, update, publish, and delete technical documents in SQLite. Use when the user mentions Portulan MCP, /api/mcp, document library agents, publishing share links, or maintaining Markdown docs via MCP in Cursor or Claude Code.
---

# Portulan MCP

Guia para agentes operarem a biblioteca técnica **Portulan** via MCP Streamable HTTP.

## Pré-requisitos

1. App rodando: `npm run dev` (Node 20+) no repo Portulan
2. Endpoint: `http://localhost:3000/api/mcp`
3. Servidor MCP: `portulan` v0.7.0

Sem o dev server, conexões falham (`CONNECTION_CLOSED`, timeout ou 401).

## Conectar o cliente MCP

### Cursor

No projeto Portulan Docs, use `.cursor/mcp.json`. Em outros workspaces, adicione ao MCP global ou ao `mcp.json` do projeto:

```json
{
  "mcpServers": {
    "portulan": {
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
    "portulan": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Se o cliente só suporta stdio, use `mcp-remote`:

```json
{
  "mcpServers": {
    "portulan": {
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

## Ferramentas (17)

| Ferramenta | Quando usar |
|---|---|
| `get_system_guide` | **Primeiro** quando não souber como escrever conteúdo — guia completo gerado do catálogo |
| `list_documents` | Descobrir o que existe; buscar por título, tag, tipo ou status |
| `get_document` | Ler conteúdo completo antes de editar |
| `create_document` | Assunto novo, sem documento equivalente |
| `update_document` | Editar rascunho/revisão; não cria versão publicada |
| `publish_document` | Gerar link público imutável da versão atual |
| `list_document_releases` | Recuperar links `/d/{slug}` (estável) e `/p/{id}` (versão fixa) já publicados |
| `delete_document` | Remover definitivamente (só UUID) |
| `list_templates` | Descobrir os templates disponíveis e seus conteúdos-base |
| `get_template` | Ler um template completo (cores + conteúdo-base) |
| `create_template` | Criar um template particular com paleta e Markdown inicial |
| `update_template` | Alterar nome, cores ou conteúdo-base de um template |
| `duplicate_template` | Clonar um template acessível como template particular |
| `preview_template` | Resumo leve de um template (títulos + trecho inicial) |
| `delete_template` | Remover definitivamente um template particular |
| `list_markdown_components` | Catálogo de diretivas `:::` e Markdown do editor |
| `explain_markdown_component` | Sintaxe, atributos e exemplos de um componente |

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

- `update_document` salva o rascunho sem criar uma nova versão.
- `publish_document` cria um novo snapshot imutável em `document_releases`, avança a versão e retorna `stablePublicPath: "/d/{slug}"` (sempre a última versão) e `publicPath: "/p/{releaseId}"` (versão fixa).
- Links antigos `/p/...` **não mudam** quando o documento é editado depois; nova publicação = novo link de versão fixa. O link `/d/{slug}` passa a apontar para a versão mais recente.
- Links públicos: `http://localhost:3000/d/{slug}` (última versão) e `http://localhost:3000/p/{releaseId}` (versão fixa).

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
3. Compartilhar {origin}/d/{slug} para a última versão ou {origin}/p/{release.id} para fixar uma versão
4. list_document_releases(id) → ver histórico de versões publicadas
```

### Excluir

```
delete_document(id: "<uuid>")
```

Irreversível. Confirme com o usuário antes.

### Manter templates

```
1. list_templates → consultar id, paleta e conteúdo-base existentes
2. get_template → ler conteúdo completo antes de editar ou clonar
3. create_template → criar uma variação particular, quando apropriado
4. duplicate_template → copiar um template interno ou particular
5. preview_template → inspecionar títulos e trecho inicial sem baixar tudo
6. update_template → ajustar nome, cores ou conteúdo-base sem alterar documentos já criados
```

### Escolher componente Markdown

```
1. get_system_guide → visão completa (produto, componentes, living, QA)
2. list_markdown_components → descobrir diretivas e previews
3. explain_markdown_component(name) → sintaxe, atributos e exemplos antes de escrever
```

Templates internos também podem ter nome, paleta e conteúdo-base ajustados; não podem ser excluídos. Templates particulares só podem ser alterados ou excluídos pelo respectivo usuário.

### Escolha do componente certo

| Conteúdo | Use |
|---|---|
| Cenários de QA / aceite | `:::testcase` com id estável e status durável |
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
| `:::alert{variant="info" style="tint" title="..."}` | Markdown livre; `style`: `tint`, `line` ou `solid` |
| `:::callout{title="..."}` | Markdown livre |
| `:::banner{title="..."}` | Markdown livre |
| `:::stats{layout="grid"}` | `- Label \| valor \| delta \| up\|down` por linha; `layout`: `grid` ou `strip` |
| `:::cards{layout="grid"}` | `- eyebrow \| título \| corpo`; `layout`: `grid` ou `list` |
| `:::steps` | `- título \| corpo` |
| `:::timeline{state="current"}` | `- data \| título \| corpo \| estado opcional`; `state`: `done` ou `current` |
| `:::checklist` | Tarefas rastreáveis com `- [ ]` ou `- [x]` · subtítulo opcional após `\|` |
| `:::testcase{id="PRD-01" status="pending" priority="high" title="…"}` | Cenário de QA; corpo Markdown livre; status: pending · ok · partial · error |

**Living:** checklist e testcase persistem no Markdown quando o usuário pode editar o documento (prévia do editor, rascunho e links públicos com sessão editor). PDF/impressão exibe badge estático.

**Quando NÃO usar `:::checklist`:** critérios, sintomas, condições ou listas informativas (“quando escalar”, “sinais de alerta”) → use bullets Markdown normais (`- item`) no corpo da seção, **não** dentro de `:::checklist`. O `-` vira lista com marcador; checkbox só com `[ ]` / `[x]`.

**Preferir `:::testcase` a tabelas largas** para registrar execução de cenários de QA.

Exemplo testcase:

```markdown
:::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal ainda disponível"}
**Pré-condição:** conta ativa

**Passos:** GET /availability

**Resultado esperado:** remaining > 0
:::
```

**Stats:** se não houver delta, omita a terceira coluna — não use `-` como placeholder (`- Label | valor` basta).
| `:::kv` | `- chave \| valor` |
| `:::progress{size="regular" tone="ok"}` | `- label \| 0-100 \| tom opcional`; `size`: `regular` ou `compact`; `tone`: `ok`, `warn`, `err`, `a2` |
| `:::chart{type="bar\|line\|area\|column\|donut\|gauge\|spark" title="..."}` | `- rótulo \| número` por linha. Use o componente **Gráfico configurável** para trocar `type`. |
| `:::chart{type="stacked" title="..."}` | `- rótulo \| número` por linha |
| `:::chart{type="target" title="..."}` | `- rótulo \| realizado \| meta` por linha |
| `:::decision{status="approved\|pending\|rejected" style="note\|banner" title="..."}` | Markdown livre |
| `:::comparison` | `- rótulo \| atual \| meta` por linha |
| `:::milestones{state="planned"}` | `- data \| marco \| estado opcional`; `state`: `done`, `current`, `planned` |
| `:::actions{state="open"}` | `- ação \| responsável \| prazo \| estado opcional`; `state`: `open`, `done`, `blocked` |
| `:::risks{level="medium"}` | `- risco \| impacto \| mitigação \| nível opcional`; `level`: `low`, `medium`, `high` |
| `:::scorecard` | `- objetivo \| estado \| evidência` por linha |
| `:::evidence` | `- evidência \| fonte \| data` por linha |
| `:::api{method="GET" path="/..."}` | Corpo JSON do endpoint |
| `:::terminal` | Comando e saída em texto livre |
| `:::filetree{title="..."}` | Estrutura de arquivos em texto livre |
| `:::diff{title="..."}` | Linhas com `+` ou `-` em texto livre |
| `:::env` | `- chave | valor | escopo` por linha |
| `:::logs{level="INFO"}` | `- horário \| mensagem` ou `- horário \| INFO\|WARN\|ERROR \| mensagem` |
| `:::tests{status="PASS"}` | `- teste \| observação` ou `- teste \| PASS\|FAIL \| observação` |
| `:::columns{count="2"}` | Colunas separadas por uma linha `---`; aceita Markdown e diretivas aninhadas |
| `:::people{layout="directory"}` | `- nome \| papel \| escopo`; `layout`: `directory` ou `cards` |
| `:::agenda` | `- tópico \| responsável \| duração` por linha |
| `:::faq{mode="expanded"}` | `- pergunta \| resposta`; `mode`: `expanded` ou `collapsed` |
| `:::experiment` | `- hipótese \| métrica \| estado` por linha |
| `:::slo{status="ok"}` | `- serviço \| meta \| atual \| estado opcional`; `status`: `ok`, `warn`, `err` |
| `:::changelog` | `- versão \| data \| descrição` por linha |
| `:::glossary` | `- termo \| definição` por linha |
| `:::resources` | `- recurso \| tipo \| descrição` por linha |
| `:::properties` | `- campo \| valor \| status\|person\|date\|url` por linha |
| `:::daci` | `- papel DACI \| pessoa ou grupo` por linha |
| `:::related` | `- item \| relação \| estado` por linha |

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

Deve listar 17 ferramentas.

## API HTTP (alternativa ao MCP)

Mesma base SQLite, sem MCP:

- `GET /api/documents?q=&type=&status=`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`

Use MCP quando o agente precisa de ferramentas tipadas; use HTTP para integrações custom.

## Referência detalhada

- Schemas e exemplos: [reference.md](reference.md)
- Guia completo (download): [portulan-mcp-skill.md](../../../portulan-mcp-skill.md)
- Índice da skill: [INDEX.md](INDEX.md)
