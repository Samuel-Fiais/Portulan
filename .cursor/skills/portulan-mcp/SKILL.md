---
name: portulan-mcp
description: Operates the Portulan MCP server for cartas, gabaritos, compartilhamento, comentários e publicação. Setup assumes the human pastes the Guia do Agente with ptl_…; the agent configures MCP, exports PORTULAN_TOKEN, tests curl, then calls get_system_guide. Use when the user mentions Portulan MCP, /api/mcp, list_documents, publishing /d or /p links, or document tools.
---

# Portulan MCP

Guia para agentes operarem o **Portulan** via MCP Streamable HTTP — cartoteca editorial. Na UI: **carta** (`document`), **gabarito** (`template`), **porto** (`workspace`). As ferramentas MCP mantêm os nomes técnicos em inglês.

**Não substitui** `docs/product/` (regras `RN-xx`, fluxos) nem a skill **portulan-ice** (backlog). Use esta skill para *como* chamar o MCP; use o modelo de produto para *o que* é permitido.

## Pré-requisitos

1. Portulan na cloud: `https://portulan.vercel.app` · MCP: `https://portulan.vercel.app/api/mcp`
2. **Guia do Agente** colado pelo humano (com `ptl_…` na mesma mensagem) — você executa todo o setup
3. Servidor MCP: `portulan` v0.10.0

Localhost (`http://localhost:3000/api/mcp`) só quando o responsável desenvolve o repo Portulan.

Sem chave válida ou MCP desconectado: 401 ou ferramentas indisponíveis.

## Resolução MCP (siga nesta ordem)

Use este roteiro **antes** de concluir que a chave é inválida ou que “não está na base”.

### 1. Identifique **seu** cliente MCP

| Se você enxerga… | Seu arquivo | Como passa a chave |
|---|---|---|
| Config em JSON no workspace | `mcp.json` | `headers.Authorization: Bearer ptl_…` |
| Config em TOML (`config.toml`) | `.codex/config.toml` (copie de `.codex/config.toml.example`) | `http_headers = { Authorization = "Bearer ptl_…" }` — **você** grava; arquivo gitignored |

**Regra:** editar `mcp.json` **não** configura um cliente TOML — e vice-versa. Colar `ptl_…` no chat **não** autentica nada.

### 2. Escolha o endpoint

| Cenário | URL MCP |
|---|---|
| Produção / agentes em checkout externo | `https://portulan.vercel.app/api/mcp` |
| Dev local (`npm run dev` no repo Portulan) | `http://localhost:3000/api/mcp` |

Local e cloud em geral compartilham o **mesmo Neon** — a mesma `ptl_…` vale nos dois se endpoint + Bearer/env estiverem certos.

### 3. Checklist antes de pedir chave nova

1. [ ] Arquivo **do seu cliente** editado (não o de outro)
2. [ ] JSON ou TOML: Bearer gravado por **você** · `export PORTULAN_TOKEN=…` no **seu** shell
3. [ ] `npm run dev` rodando (se localhost)
4. [ ] Teste HTTP (abaixo) retorna **200**, não 401
5. [ ] Só então: `get_system_guide`

### 4. Teste HTTP (confirma chave + endpoint)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST ENDPOINT_AQUI/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer ptl_SUA_CHAVE' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

- **401** → Bearer ausente/errado ou endpoint errado (volte ao passo 1–2)
- **406** → falta header `Accept` (não é problema da chave)
- **200** → chave OK; se o cliente ainda falha, o problema é **config do cliente**, não o Portulan

### 5. Depois de conectar

- `get_system_guide` e `list_workspaces`

## Chaves MCP (RN-55, RN-111, F-mcp-token)

**Humano:** gera `ptl_…` no modal da conta e cola o **Guia do Agente** no chat (chave na mesma mensagem). **Nada mais.**

**Você (agente):** receber `ptl_…` no chat **não conecta** o MCP. **Você** grava Bearer na config do **seu** cliente, `export PORTULAN_TOKEN` no **seu** terminal, testa curl e reconecta o MCP se o cliente permitir.

A chave fica presa ao **porto ativo** no momento em que foi gerada. Outro porto = o humano gera chave nova.

**Local vs cloud:** `npm run dev` em geral usa o **mesmo Neon** que produção (`DATABASE_URL`). Chave gerada em `localhost:3000` ou em `portulan.vercel.app` autentica nos dois — desde que o **endpoint** e o **header Bearer** batam. Não conclua “chave inválida” ou “não está na base” sem checar a config MCP (`mcp.json`) primeiro.

Catálogo: **31 ferramentas** (`lib/mcp-tool-catalog.ts`). Chave nova não tem identidade. Chave legada com identidade só chama as ferramentas da lista gravada (RN-111).

## Setup com chave do responsável

O **Guia do Agente** (modal da conta) é o mesmo roteiro.

### Papéis

| Quem | Faz |
|---|---|
| **Humano** | Gera `ptl_…` + cola **Guia do Agente** no chat. **Só isso.** |
| **Agente (você)** | Config MCP, `export`, curl, reconectar, operar |

**Não peça ao humano** `export`, editar config nem terminal — isso é **seu** trabalho.

### Se o guia veio sem chave

> Falta a `ptl_…` junto com o guia. Cole na mesma mensagem.

### Checklist do agente (com chave recebida)

1. **Config MCP** do seu cliente (JSON ou TOML — § Config MCP)
2. **`export PORTULAN_TOKEN=ptl_…`** e `PORTULAN_ENDPOINT` no seu shell
3. **curl** initialize → **200** (§ Resolução MCP)
4. Após o MCP responder → `get_system_guide` e `list_workspaces`

### Config MCP

Cada **cliente** usa arquivo e formato próprios. Editar só o do **seu** ambiente — outros formatos não se aplicam.

**JSON (`mcp.json`)** — Bearer inline no header:

```json
{
  "mcpServers": {
    "portulan": {
      "url": "https://portulan.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ptl_CHAVE_QUE_O_HUMANO_PASSOU"
      }
    }
  }
}
```

**TOML (`config.toml`)** — **você** grava Bearer em `http_headers` (arquivo local gitignored):

```toml
[mcp_servers.portulan]
url = "http://localhost:3000/api/mcp"
http_headers = { Authorization = "Bearer ptl_CHAVE_RECEBIDA" }
```

Modelos sem segredo: `.cursor/mcp.json.example`, `.codex/config.toml.example`.

**Nunca** commite `ptl_…` (RN-106). O humano **não** edita estes arquivos — **você** edita.

### Depois do setup

**401:** na ordem — (1) usou o **formato certo do seu cliente** (JSON com Bearer **ou** TOML com `PORTULAN_TOKEN` no processo)? (2) reconectou/reiniciou após editar? (3) endpoint bate com onde a chave foi gerada? Só então: errada, expirada ou revogada — peça ao responsável.

## Ferramentas (31)

Agrupamento do catálogo (`F-mcp-token`). Respostas são JSON em `content[0].text`. Erros usam `isError: true`.

### Porto (F-mcp-portos)

| Ferramenta | Quando usar |
|---|---|
| `list_workspaces` | Portos da pessoa e qual deles este token opera (RN-55) |

### Cartas (F-mcp-docs)

| Ferramenta | Quando usar |
|---|---|
| `list_documents` | Descobrir cartas do porto do token (+ compartilhadas nominalmente); busca por título, tag, conteúdo, template ou status |
| `get_document` | Ler conteúdo completo antes de editar |
| `create_document` | Assunto novo, sem equivalente; nasce privado no porto do token |
| `update_document` | Editar rascunho; `visibility` e `workspace_id` (RN-17, RN-18, RN-19) |
| `duplicate_document` | Clonar carta como rascunho (releases não copiadas) |
| `delete_document` | Remover definitivamente (**só UUID**) |
| `publish_document` | Gerar release imutável; visibilidade não muda |
| `list_document_releases` | Links `/d/{uuid}` e `/p/{releaseId}` já publicados |
| `update_document_release` | Ativar/desativar uma versão fixa `/p/{id}` |
| `restore_document` | Copiar release para o rascunho (RN-09); não publica |

### Gabaritos (F-mcp-templates)

| Ferramenta | Quando usar |
|---|---|
| `list_templates` | Gabaritos do porto e internos |
| `get_template` | Ler gabarito completo |
| `create_template` | Novo gabarito no porto do token |
| `update_template` | Nome, cores, conteúdo-base; `workspace_id` move de porto (RN-95) |
| `duplicate_template` | Clonar gabarito acessível |
| `preview_template` | Títulos + trecho sem baixar tudo |
| `delete_template` | Remover gabarito do porto (não internos) |

### Compartilhamento (F-mcp-share)

| Ferramenta | Quando usar |
|---|---|
| `list_document_shares` | Convites por e-mail de carta privada (só cartógrafo) |
| `share_document` | Convidar leitor ou editor por e-mail (RN-93 sinaliza externo) |
| `update_document_share` | Trocar leitor/editor (só cartógrafo) |
| `revoke_document_share` | Revogar convite (só cartógrafo) |

### Revisão (F-mcp-comentarios)

| Ferramenta | Quando usar |
|---|---|
| `list_document_comments` | Fios de comentário no rascunho (RN-61) |
| `create_document_comment` | Raiz com âncora opcional ou resposta com `parent_id` (RN-65) |
| `resolve_document_comment` | Resolver ou reabrir o fio |
| `delete_document_comment` | Remover o próprio; raiz encerra o fio |

### Mídia (F-mcp-upload)

| Ferramenta | Quando usar |
|---|---|
| `upload_image` | Imagem base64 → URL para `:::figure{src=...}` |
| `upload_file` | Anexo base64 → URL para `:::file{url=... name=...}` |

### Catálogo e guia (F-mcp-catalogo, F-mcp-guia)

| Ferramenta | Quando usar |
|---|---|
| `get_system_guide` | **Primeiro** ao escrever cartas — guia + **Como evitar erros** |
| `list_markdown_components` | Catálogo de diretivas `:::` |
| `explain_markdown_component` | Sintaxe, `avoidErrors` e exemplos de um componente |

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
| `published` | Publicado na cartoteca |
| `archived` | Arquivado |

### Versão e publicação

- `update_document` salva o rascunho sem criar uma nova versão.
- **Estado living (RN-54):** se o payload incluir `content`, o servidor preserva `status` de `:::testcase` (por `id`) e checkboxes de `:::checklist` (por título) já salvos no rascunho — o valor do agente no payload é ignorado para itens que já existiam. Use `get_document` antes de editar; não dependa de resetar QA com `status="pending"` ou `- [ ]` no replace completo.
- `publish_document` com `content` aplica a mesma preservação antes de criar o snapshot.
- `publish_document` cria um novo snapshot imutável em `document_releases`, avança a versão e retorna `stablePublicPath: "/d/{uuid}"` (UUID fixo na criação; não muda ao renomear título) e `publicPath: "/p/{releaseId}"` (versão fixa). **Não** muda a visibilidade: o documento nasce e permanece privado até `update_document` com `visibility: "workspace"` ou `"public"`.
- Links antigos `/p/...` **não mudam** quando o documento é editado depois; nova publicação = novo link de versão fixa. O link `/d/{uuid}` passa a apontar para a versão mais recente.
- Links `/d` e `/p`: `https://portulan.vercel.app/d/{uuid}` (última versão) e `https://portulan.vercel.app/p/{releaseId}` (versão fixa). Visitante sem login só vê se a visibilidade for `public`.

### Porto (workspace) e visibilidade

O token MCP opera em **um** porto, fixado quando foi gerado (RN-55). Documentos e templates criados pelo agente nascem nesse porto; `list_documents` e `list_templates` enxergam o acervo dele (mais os documentos compartilhados nominalmente com a pessoa). Para operar em outro porto, o usuário troca de porto na UI e gera um token novo. `list_workspaces` mostra os portos disponíveis e marca qual deles é o do token.

O agente reorganiza o acervo com `workspace_id` em `update_document` (só o cartógrafo move a carta, e só para porto onde ele é tripulante — RN-19) e em `update_template` (exige capitania nos dois portos — RN-95). Nada disso muda o porto do token: depois de mover cartas para um porto novo, gerar um token nele para continuar enxergando-as em `list_documents`.

`update_document` aceita `visibility` com três níveis (RN-17, RN-18). Só o responsável muda:

| Valor | Quem lê |
|---|---|
| `private` | Só o responsável e quem foi convidado por e-mail. Padrão de todo documento novo. |
| `workspace` | Toda a tripulação do porto do documento, **em leitura**. Exige documento com porto. |
| `public` | Qualquer pessoa com `/d` ou `/p` vê a versão publicada habilitada. |

`is_public: true` / `false` continua funcionando como atalho legado para `public` / `private`.

### Identificadores

- Cartas, gabaritos, releases e comentários usam UUID.
- `delete_document`: exige **UUID** (`id` do documento).
- Após `create_document`, guarde o `id` retornado.

## Fluxos recomendados

### Criar documento novo

```
1. list_documents (query opcional) → confirmar que não existe equivalente
2. create_document → type + title + content (+ summary, tags, author, team)
3. publish_document (se precisar de uma versão imutável)
4. update_document visibility="workspace" (a tripulação do porto lê) ou "public" (qualquer pessoa com o link)
```

Prefira `type` coerente com o template em `lib/documents.ts` (`templates`).

### Atualizar existente

```
1. get_document(id ou uuid do link /d/{uuid})
2. update_document(id, campos alterados)
3. publish_document(id) → se precisar de link da nova versão
```

### Restaurar versão no rascunho

```
1. list_document_releases(document_id) → obter release_id e version
2. restore_document(document_id, release_id) → copia snapshot para o rascunho
3. publish_document(document_id) → se precisar registrar o rascunho restaurado como nova versão
```

Regras: RN-09 (não altera releases, não incrementa version, não publica); RN-54 (estado living do rascunho prevalece). Responsável e editor convidado podem restaurar.

### Inserir imagem ou anexo

```
1. get_document(id) → confirmar permissão de edição
2. upload_image ou upload_file(document_id, content_base64, filename, content_type)
3. update_document(id, content: "... :::figure{src=\"<url>\"} ..." ou :::file{url=\"<url>\" name=\"<filename>\"})
4. publish_document(id) → se o link público precisar do arquivo
```

**Regra:** faça upload **antes** de inserir a URL no Markdown. Limites iguais à UI (RN-45): imagens PNG/JPG/WEBP/SVG/GIF; anexos qualquer tipo; até 5 MB.

**Regra:** prefira `update_document` em documento existente; não duplique o assunto com `create_document`. Para clonar um documento inteiro, use `duplicate_document`.

### Publicar para compartilhar com convidados

```
1. Garantir conteúdo final (update_document se necessário)
2. publish_document(id)
3. Compartilhar o documento por e-mail (UI ou MCP de shares). /d e /p abrem para responsável e convidados autenticados
4. Alternativa para o porto inteiro: update_document visibility="workspace" — a tripulação lê sem convite nominal
```

### Abrir o link a qualquer pessoa

```
1. publish_document(id) se ainda não houver versão
2. update_document(id, visibility: "public") — só o responsável
3. Compartilhar {origin}/d/{slug} ou {origin}/p/{release.id}
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
3. create_template → criar uma variação no porto do token, quando apropriado
4. duplicate_template → copiar um template interno ou do porto
5. preview_template → inspecionar títulos e trecho inicial sem baixar tudo
6. update_template → ajustar nome, cores ou conteúdo-base sem alterar documentos já criados
```

### Revisar com comentários

```
1. get_document(id) → confirmar acesso e ver conteúdo do rascunho
2. list_document_comments(document_id) → fios existentes (root + replies)
3. create_document_comment(document_id, body, section_anchor?, quoted_text?) → comentário-raiz
4. create_document_comment(document_id, body, parent_id) → resposta no fio
5. delete_document_comment(document_id, comment_id) → remover o próprio
```

Comentários seguem RN-61 e RN-65: só no editor autenticado, para quem tem acesso ao documento. Sem comentário anônimo em `/d` ou `/p`. `section_anchor` deve existir na prévia atual (ex.: `cover-title`, ids de `##`/`###`, `block-{section}-{index}`).

### Compartilhar carta privada (convite nominal)

```
1. get_document(id) → confirmar que você é o cartógrafo
2. list_document_shares(document_id) → convites atuais
3. share_document(document_id, email, role: "viewer" | "editor")
4. revoke_document_share(document_id, share_id) → quando necessário
```

Alternativa para a tripulação inteira: `update_document` com `visibility: "workspace"`. Link público: publicar + `visibility: "public"`.

### Escolher componente Markdown

```
1. get_system_guide → visão completa (produto, componentes, living, QA, **Como evitar erros**)
2. list_markdown_components → descobrir diretivas e previews
3. explain_markdown_component(name) → sintaxe, atributos, campo avoidErrors e exemplos antes de escrever
```

Leia `guide.avoidErrors` em `get_system_guide` antes de escrever blocos `:::`. Erros comuns: espaço antes de `{` na abertura, fechamento que não é só `:::`, tabelas GFM no lugar de linhas `- col | col`, aninhar diretivas fora de `:::columns`, e `}` de path API fora das aspas do atributo.

Templates internos também podem ter nome, paleta e conteúdo-base ajustados; não podem ser excluídos. Templates do porto são alterados ou excluídos pelo autor, pelo capitão ou pelo imediato daquele porto (RN-92).

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

**RN-54 — merge ao substituir conteúdo:** `update_document` e `publish_document` (com `content`) preservam status/checkboxes já salvos no rascunho para ids/títulos coincidentes. Agentes não resetam execução de QA enviando Markdown com `pending`/`[ ]`.

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
| `CONNECTION_CLOSED` | Cloud inacessível ou URL errada | Confirme `https://portulan.vercel.app/api/mcp` |
| `401 Não autorizado` | Config do **cliente errado** ou Bearer/`PORTULAN_TOKEN` ausente | Siga **Resolução MCP** §1–3; reinicie o cliente |
| `401` com curl 200 | Config do cliente errada ou desatualizada | **Você** regrava Bearer no arquivo certo do **seu** cliente |
| `401` curl também 401 | Chave revogada/expirada ou endpoint errado | Peça chave nova ao responsável |
| `406 Not Acceptable` | Falta `Accept: application/json, text/event-stream` | Corrigir headers HTTP, não a chave |
| Ferramentas não aparecem | MCP desconectado | Reconectar + teste curl |
| “Não está na base” | Diagnóstico prematuro | curl 200 prova que está na base — falta config do cliente |
| `Documento não encontrado` | ID/slug errado | `list_documents` |
| `delete_document` falha | Slug em vez de UUID | Use `document.id` de `get_document` |

Teste manual:

```bash
curl -sS -X POST https://portulan.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer ptl_SUA_CHAVE' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

Sem `Authorization` → **401**. Com Bearer válido → **200** (SSE). Depois, `tools/list` lista as ferramentas da chave.

## API HTTP (alternativa ao MCP)

Mesmo banco (PostgreSQL via Drizzle), sem MCP:

- `GET /api/documents?q=&type=&status=`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`

Use MCP quando o agente precisa de ferramentas tipadas; use HTTP para integrações custom.

## Referência detalhada

- Schemas e exemplos: [reference.md](reference.md)
- Catálogo no código (fonte de verdade dos nomes): `lib/mcp-tool-catalog.ts`
- Handler: `app/api/mcp/route.ts`
- Índice da skill: [INDEX.md](INDEX.md)
