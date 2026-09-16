# Portulan MCP — Referência

## Implementação no projeto

| Item | Caminho |
|---|---|
| Handler MCP | `app/api/mcp/route.ts` |
| Catálogo (49 ferramentas, grupos Instrumentos) | `lib/mcp-tool-catalog.ts` |
| Dev-context (Agente de Bordo) | `lib/mcp-dev-context-tools.ts` |
| Banco (PostgreSQL / Drizzle) | `lib/db/` (`schema.ts`, `documents.ts`, `templates.ts`, `workspaces.ts`, …) |
| Tipos e templates editoriais | `lib/documents.ts` |
| Portos (workspaces) | `lib/workspace-policy.ts`, `lib/active-workspace.ts` |
| Validação Zod | `lib/validation.ts` |
| Config Cursor | `.cursor/mcp.json` |
| Páginas públicas | `app/d/[slug]/page.tsx`, `app/p/[releaseId]/page.tsx` |

Variáveis de ambiente (`.env.example`):

```dotenv
DATABASE_URL=
MCP_API_KEY=
BLOB_READ_WRITE_TOKEN=   # upload_image / upload_file
```

CLI / checkout (agente):

```dotenv
PORTULAN_TOKEN=ptl_…       # chave MCP — nunca commitar (RN-106)
PORTULAN_ENDPOINT=https://portulan.vercel.app
```

Implementação CLI: `cli/portulan.mjs` · bin `portulan` em `package.json`.

---

## CLI — `portulan init` e `portulan doctor`

Preparação local do checkout (RN-106, F-cli-init). O **humano** fornece `ptl_…`; o **agente** roda o CLI. Ver **Setup com chave do responsável** em `SKILL.md`.

### `portulan init`

```bash
npm run portulan -- init [--yes] [--endpoint=https://portulan.vercel.app]
```

| Flag | Efeito |
|---|---|
| `--yes` | Aceita editar arquivos existentes e padrões de Expedição sem perguntar |
| `--endpoint=` | URL base do Portulan (default: `PORTULAN_ENDPOINT` ou `https://portulan.vercel.app`) |

**Pré-requisito:** chave `ptl_…` entregue pelo responsável humano em `PORTULAN_TOKEN` / `PORTULAN_MCP_TOKEN` (ou keychain macOS `service=portulan-mcp`). O agente não gera chave na UI.

**Cria/atualiza:**

| Artefato | Conteúdo |
|---|---|
| `.portulan/config.json` | `workspaceId`, `repositoryId`, `projectIds`, `endpoint`, `remoteUrl` — sem token, sem path absoluto |
| `.portulan/AGENT.md` | Protocolo deste checkout |
| `AGENTS.md`, `CLAUDE.md` | Bloco `BEGIN:portulan-dev-context` |
| `.cursor/rules/portulan-dev-context.mdc` | Mesmo bloco, se `.cursor/` existir |

**API interna:** `POST /api/cli/repositories`, `GET /api/cli/projects`, `GET /api/cli/doctor`.

### `portulan doctor`

```bash
npm run portulan -- doctor
```

Verifica: token presente, `config.json` válido (sem segredo/path absoluto), vínculo Embarcação↔Expedição no servidor, `.portulan/AGENT.md`, blocos gerenciados. Saída `portulan doctor: ok` ou lista de problemas (exit 1).

### Depois do `init`

1. Humano entrega `ptl_…`; agente configura `.cursor/mcp.json` ou env.
2. Chame `get_agent_bootstrap` com `repository_id` de `.portulan/config.json`.

---

## Ferramentas — schemas e exemplos

### `list_workspaces`

Sem input. Retorna os portos (workspaces) da pessoa autenticada e marca qual deles este token opera (RN-55).

```json
{
  "activeWorkspaceId": "uuid-do-porto-do-token",
  "workspaces": [
    { "id": "uuid-do-porto-do-token", "name": "Porto de Marina", "role": "owner", "isPersonal": true, "memberCount": 1 }
  ]
}
```

Documentos e templates criados pelo agente nascem em `activeWorkspaceId`. Para operar em outro porto, o usuário troca de porto na UI e gera um token novo.

### `create_workspace`

Recebe `{ "name": "Festpay" }` e cria um porto com a pessoa autenticada como capitão (RN-86). Retorna `{ "workspace": { "id": "...", "name": "...", "role": "owner", "memberCount": 1 } }`.

O token **não** passa a operar o porto novo (RN-55). Use o `id` retornado como destino em `update_document` / `update_template` e, para o agente trabalhar dentro dele depois, gere um token nesse porto na tela Instrumentos.

### `list_templates`, `get_template`, `create_template`, `update_template`, `duplicate_template`, `preview_template`, `delete_template`

`list_templates` retorna templates internos e os templates do porto deste token (mais os particulares legados do usuário), incluindo `id`, `name`, `workspaceId`, `primaryColor`, `secondaryColor` e `content`.

`get_template` recebe `{ "id": "..." }` e retorna o template completo quando o usuário tem acesso.

`duplicate_template` recebe `{ "id": "...", "name": "opcional" }` e cria um clone no porto deste token, com novo id.

`preview_template` recebe `{ "id": "...", "max_chars": 400 }` e retorna nome, cores, `headings` (`##`/`###`) e `contentPreview`.

```json
{
  "name": "Status de engenharia",
  "primary_color": "#1A2847",
  "secondary_color": "#8B2735",
  "content": "## Visão geral\n\n:::stats\n- Disponibilidade | 99,9%\n:::"
}
```

Use esse corpo com `create_template`. Para `update_template`, acrescente o `id` e envie apenas os campos a mudar. `delete_template` recebe `{ "id": "..." }` e só exclui templates particulares; modelos internos podem ser editados, mas não excluídos.

`update_template` também aceita `workspace_id` para mover o template para outro porto (`{ "id": "...", "workspace_id": "uuid-do-porto" }`). Exige capitania (capitão ou imediato) no porto atual e no de destino, e não se aplica a modelos internos (RN-95).

### `get_system_guide`

Sem parâmetros. Retorna `guide` gerado em tempo real a partir de `lib/system-guide.ts` e do catálogo em `lib/markdown-components.ts`. Inclui `avoidErrors` (**Como evitar erros**) com regras globais, exemplos ruim/bom e falhas comuns de agentes; cada entrada do catálogo traz `avoidErrors` específicos.

### `list_markdown_components`, `explain_markdown_component`

`list_markdown_components` não exige parâmetros e retorna o catálogo compartilhado com o editor (`lib/markdown-components.ts`).

`explain_markdown_component` recebe `{ "name": "alert" }` (id, título pt-BR ou diretiva) e devolve passos, atributos, regras, campo `avoidErrors` (armadilhas) e exemplos. Retorna erro se o componente for desconhecido.

### `upload_image`, `upload_file`

Enviam arquivos para o mesmo Blob storage da UI (requer `BLOB_READ_WRITE_TOKEN` no servidor). Input com base64 — prefixo `data:...;base64,` opcional.

**`upload_image`**

```json
{
  "document_id": "uuid-do-documento",
  "content_base64": "<bytes em base64>",
  "filename": "diagrama.png",
  "content_type": "image/png"
}
```

**Output:** `{ "url", "pathname", "purpose": "report-image", "name" }` — use `url` em `:::figure{src="..."}`.

Limites: PNG, JPG, WEBP, SVG ou GIF; até 5 MB (RN-45).

**`upload_file`**

```json
{
  "document_id": "uuid-do-documento",
  "content_base64": "<bytes em base64>",
  "filename": "especificacao.pdf",
  "content_type": "application/pdf"
}
```

**Output:** `{ "url", "name", "pathname", "purpose": "report-file" }` — use em `:::file{url="..." name="..."}`.

Limites: qualquer tipo; até 5 MB (RN-45).

Fluxo recomendado: upload → `update_document` com a URL → `publish_document` se necessário.

---

### `list_documents`

**Input (todos opcionais):**

```json
{
  "query": "webhook",
  "template_id": "portulan-default",
  "status": "published"
}
```

`query` busca em título, resumo, tags e corpo Markdown do rascunho.

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

---

### `get_document`

**Input:**

```json
{ "id": "checkout-recorrente-via-pix" }
```

Aceita UUID ou slug.

**Output:** objeto `document` completo com `content`.

---

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

---

### `duplicate_document`

**Input:**

```json
{
  "id": "uuid-ou-slug",
  "title": "opcional — padrão: {título original} — cópia"
}
```

Clona o rascunho atual em um documento novo (`draft`, `version: 1`, novo slug UUID). Copia resumo, template, autor, time, tags e conteúdo. Releases do original **não** são copiadas. Apenas o responsável pode duplicar (RN-10).

**Output:** `{ "document": { ... } }` com o clone criado.

---

### `update_document`

**Input (obrigatório: `id`; demais opcionais):**

```json
{
  "id": "uuid-do-documento",
  "content": "## 01 — Atualizado\n\nNovo texto.",
  "status": "review"
}
```

Salva o rascunho sem criar uma nova versão publicada.

`visibility` (opcional, só o responsável — RN-17, RN-18): `"private"` restringe a responsável e convidados nominais; `"workspace"` deixa toda a tripulação do porto do documento **ler** (exige documento com porto); `"public"` permite que qualquer pessoa com `/d` ou `/p` veja a versão publicada. Documentos nascem `private`.

`is_public` (opcional): atalho legado — `true` equivale a `visibility: "public"`, `false` a `"private"`.

`workspace_id` (opcional, só o responsável — RN-19): move o documento para outro porto da pessoa. Convites nominais e releases já publicadas não mudam; um documento em `visibility: "workspace"` passa a ser lido pela tripulação do porto novo. Mover para fora do porto do token tira o documento do `list_documents` daquele token.

Quando `content` é enviado, o servidor faz merge do estado living (RN-54): `status` de `:::testcase` e checkboxes de `:::checklist` já salvos no rascunho prevalecem sobre os valores do payload para o mesmo `id` ou título de item. Itens novos no payload mantêm o estado enviado pelo agente.

### `publish_document`

**Input:**

```json
{
  "id": "uuid-ou-slug",
  "content": "opcional — publica já com alterações pendentes"
}
```

Cria uma nova versão e um snapshot imutável. **Não** muda a visibilidade; use `update_document` com `visibility` para isso.

Se `content` for enviado, aplica RN-54 (mesmo merge de estado living do rascunho que `update_document`) antes de publicar.

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
  "publicPath": "/p/uuid-release",
  "stablePublicPath": "/d/document-slug"
}
```

URL completa: `https://portulan.vercel.app/d/{slug}` (última versão) ou `https://portulan.vercel.app/p/{release.id}` (versão fixa). Localhost só em dev do Portulan.

---

### `list_document_releases`

**Input:**

```json
{ "id": "uuid-ou-slug" }
```

**Output:**

```json
{
  "documentId": "uuid",
  "slug": "document-slug",
  "stablePublicPath": "/d/document-slug",
  "releases": [
    {
      "id": "uuid-release",
      "version": 4,
      "publishedAt": "ISO",
      "publicPath": "/p/uuid-release"
    }
  ]
}
```

Ordenado por versão decrescente.

---

### `restore_document`

**Input:**

```json
{
  "document_id": "uuid-ou-slug",
  "release_id": "uuid-release"
}
```

Copia título, resumo, template, autor, time, tags e conteúdo da release indicada para o rascunho (RN-09). Releases existentes permanecem intactas; `version` do documento não avança; nada é publicado automaticamente. Estado living já salvo no rascunho prevalece sobre o snapshot (RN-54). Responsável e editor convidado podem restaurar.

Use `list_document_releases` para descobrir `release_id` e `version`.

**Output:**

```json
{
  "document": { "...": "rascunho atualizado" },
  "restoredFromRelease": {
    "id": "uuid-release",
    "version": 3,
    "publicPath": "/p/uuid-release"
  }
}
```

**Erros:** documento inexistente; release inexistente; sem permissão de edição.

---

### `update_document_release`

**Input:**

```json
{
  "document_id": "uuid-ou-slug",
  "release_id": "uuid-release",
  "disabled": true
}
```

Ativa ou desativa o acesso público de uma versão fixa `/p/{releaseId}` sem apagar o snapshot. `disabled: false` reativa.

**Output:** `{ "release": { ... }, "publicPath": "/p/...", "disabled": true }`

---

### `list_document_shares`

**Input:**

```json
{ "document_id": "uuid-ou-slug" }
```

Lista convites por e-mail de carta **privada**. Apenas o cartógrafo (responsável). Convidado fora da tripulação do porto aparece como externo na UI (RN-93).

**Output:** `{ "shares": [ { "id", "email", "role", "createdAt", ... } ] }`

---

### `share_document`

**Input:**

```json
{
  "document_id": "uuid-ou-slug",
  "email": "tripulante@exemplo.com",
  "role": "viewer"
}
```

`role`: `"viewer"` (leitor) ou `"editor"`. Não convide o cartógrafo; não duplique convite idêntico (política de share no servidor).

**Output:** `{ "share": { ... } }`

---

### `revoke_document_share`

**Input:**

```json
{
  "document_id": "uuid-ou-slug",
  "share_id": "uuid-do-convite"
}
```

Remove acesso nominal. Apenas o cartógrafo.

**Output:** `{ "revoked": true }`

---

### `list_document_comments`

**Input:**

```json
{ "document_id": "uuid-ou-slug" }
```

Lista fios de comentários do rascunho (RN-61). Cada fio tem `root` (comentário-raiz) e `replies` (respostas de um nível). Responsável, editor e leitor convidado veem todos os fios. Visitantes em `/d` ou `/p` não têm acesso.

**Output:**

```json
{
  "documentId": "uuid",
  "threads": [
    {
      "root": {
        "id": "uuid",
        "body": "Revisar escopo.",
        "sectionAnchor": "block-0-0",
        "quotedText": "Trecho citado.",
        "parentId": null,
        "userName": "Ana",
        "createdAt": "ISO"
      },
      "replies": []
    }
  ]
}
```

---

### `create_document_comment`

**Input (comentário-raiz):**

```json
{
  "document_id": "uuid-ou-slug",
  "body": "Precisamos revisar o escopo.",
  "section_anchor": "block-0-0",
  "quoted_text": "Parágrafo citado."
}
```

**Input (resposta):**

```json
{
  "document_id": "uuid-ou-slug",
  "body": "Concordo.",
  "parent_id": "uuid-do-comentario-raiz-ou-resposta"
}
```

Cria comentário-raiz ou responde em um fio existente (RN-61, RN-65). Resposta herda âncora e trecho do raiz; resposta a resposta achata para o raiz. Sem `section_anchor` = comentário geral no documento. Âncora deve existir na prévia atual (`cover-title`, ids de `##`/`###`, `block-{section}-{index}`).

Limites: `body` até 2.000 caracteres; `quoted_text` até 280.

**Output:** `{ "documentId": "uuid", "comment": { ... } }`

---

### `delete_document_comment`

**Input:**

```json
{
  "document_id": "uuid-ou-slug",
  "comment_id": "uuid-do-comentario"
}
```

Remove o próprio comentário (raiz ou resposta). Remover o raiz encerra o fio (RN-65). Só no editor autenticado — não em `/d` ou `/p`.

**Output:** `{ "deleted": true, "documentId": "uuid", "commentId": "uuid" }`

---

### `delete_document`

**Input:**

```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

Apenas UUID. Remove documento e releases (CASCADE).

**Output:** `{ "deleted": true, "id": "..." }`

---

## Templates por tipo

Copie estrutura de `lib/documents.ts` → `templates` ao criar documentos.

### `feature`

Seções típicas: Contexto, O que foi construído, Impacto, Próximos passos.  
Diretivas: `callout`, `cards`, `stats`, `checklist`.

### `incident`

Seções: Resumo, Impacto, Linha do tempo, Causa raiz, Ações preventivas.  
Diretivas: `stats`, `timeline`, `alert`, `checklist`, `kv`.

### `report`

Seções: Sumário, Entregas, Indicadores, Riscos, Próximo ciclo.  
Diretivas: `steps`, `stats`, `alert`, `progress`, tabelas.

### `reference`

Seções: Visão geral, Arquitetura, Contrato, Exemplo, Operação.  
Diretivas: `kv`, blocos de código, mermaid (se presente no conteúdo).

### Templates editoriais incluídos

- `Status semanal`: saúde, entregas, riscos e plano de ação.
- `Resumo executivo`: leitura para liderança, indicadores e decisão necessária.
- `Pós-incidente`: impacto, cronologia, causa e ações preventivas.
- `Revisão trimestral`: objetivos, evidências, tendências e prioridades.

---

## Diretivas — sintaxe completa

Abrir com `:::nome{attr="valor"}`, fechar com `:::` sozinho em linha.

### alert

```
:::alert{variant="warning" title="Atenção"}
Corpo em Markdown.
:::
```

### callout

```
:::callout{title="Oportunidade"}
Texto do callout.
:::
```

### banner

```
:::banner{title="Mensagem principal"}
Texto do banner.
:::
```

### stats

```
:::stats
- Label | 500 | ↑ meta | up
- Outro | 7% | ↓ 11 p.p. | down
:::
```

Colunas: label, valor, delta (texto livre), tom (`up` ou `down`).

### cards

```
:::cards
- Eyebrow | Título do card | Descrição curta.
:::
```

### steps

```
:::steps
- Título do passo | Descrição do passo.
:::
```

### timeline

```
:::timeline
- 18h12 | Alerta | Detalhe | done
- 18h31 | Causa | Detalhe | current
:::
```

Estados: `done`, `current`, ou vazio.

### checklist

Use **somente** para tarefas rastreáveis (pendências de projeto, ações com dono/prazo). Cada linha deve começar com `[ ]` ou `[x]`.

```
:::checklist
- [x] Item concluído | Responsável · prazo
- [ ] Item pendente | Dono · data
:::
```

**Não use** para listas de critérios ou condições (“quando escalar”, “sintomas”). Nesses casos, prefira bullets Markdown:

```markdown
- Um pedido online aparece em usuário incorreto
- O ponto de venda continua visível na tela do evento
```

Linhas em `:::checklist` **sem** `[ ]`/`[x]` renderizam como lista simples, sem checkbox.

### kv

```
:::kv
- Chave | Valor
:::
```

### progress

```
:::progress
- Implementação | 82 |
- Cobertura | 91 | ok
- Risco | 24 | err
:::
```

Tons opcionais: `ok`, `warn`, `err`, `a2`.

### chart

```
:::chart{type="bar" title="Volume por canal"}
- Web | 68
- Mobile | 44
:::
```

Tipos: `bar`, `line`, `area`, `column`, `donut`, `gauge`, `spark`. Cada linha usa `rótulo | número`. Os gráficos de linha e área exibem o valor em cada ponto; `gauge` usa o primeiro valor, entre 0 e 100.

### decision

```
:::decision{status="approved" title="Aprovar a liberação"}
Critérios técnicos e operacionais validados.
:::
```

Status: `approved`, `pending`, `rejected`.

### comparison

```
:::comparison
- Cobertura | 91% | 95%
:::
```

### milestones

```
:::milestones
- 20 set. | Liberação gradual | current
:::
```

### actions

```
:::actions
- Validar resultados | Marina | 18 set. | open
:::
```

### risks

```
:::risks
- Dependência externa | Alto | Validar contingência. | high
:::
```

### scorecard

```
:::scorecard
- Confiabilidade | No rumo | 99,95% de disponibilidade.
:::
```

### evidence

```
:::evidence
- Teste de carga aprovado | Pipeline de qualidade | 12 set.
:::
```

Formato: `rótulo | atual | meta`.

---

## Protocolo MCP

- Transporte: Streamable HTTP (POST/GET/DELETE em `/api/mcp`)
- Spec: MCP SDK v2 via `mcp-handler`
- Initialize retorna `serverInfo.name: "portulan"`
- Instruções do servidor: token preso a um porto (RN-55); para rumos, chame `get_agent_bootstrap` primeiro; publish_document gera versão; `visibility` controla quem lê

---

## Erros comuns do agente

1. **Duplicar documentos** — para clonar um documento inteiro, use `duplicate_document`; não recrie o assunto com `create_document` (RN-52).
2. **Esperar link sem publicar** — `update_document` com `status: "published"` não gera `/p/{id}`; use `publish_document`.
3. **Editar link antigo** — releases são imutáveis; publique nova versão para novo link.
4. **Slug no delete** — `delete_document` rejeita slug; use UUID.
5. **Conteúdo sem `##`** — diretivas funcionam, mas seções editoriais ficam melhor com `## 01 — Título`.
6. **Resetar QA via replace** — enviar `content` com `status="pending"` ou `- [ ]` não apaga marcações já salvas no rascunho (RN-54); use `get_document` para ver o estado real.

---

## Contexto de desenvolvimento

Implementação: `lib/mcp-dev-context-tools.ts`. **18 ferramentas** de dev-context — disponíveis para chaves MCP com identidade nomeada; chaves legadas sem identidade também têm acesso completo até revogação.

Fluxo canônico: `docs/product/fluxos.md` (Assumir Manobra e reportar). Regras: RN-101, RN-103, RN-105, RN-108, RN-109.

### `get_agent_bootstrap`

Input: `repository_id?`. Primeiro passo. Sem Embarcação:

```json
{
  "workMode": "local_implementation",
  "repository": null,
  "allowedActions": ["find_context", "create_project", "create_repository", "propose_context_pack", "claim_non_code_task", "create_coordination_message", "review_report", "report_local_test"],
  "unavailableActions": ["claim_code_task"],
  "agentIdentity": {
    "allowedMcpTools": ["…"],
    "disabledMcpTools": ["…"]
  }
}
```

Ferramentas desabilitadas na identidade (RN-111) devolvem erro na chamada MCP antes de executar.

### `create_project`

Input: `name` (2–80), `objective?`. Cria Expedição no porto do token. Retorna `projectId` e `project`.

### `create_repository`

Input: `name` (2–80), `kind?` (`git` | `local` | `both`), `remote_url?`, `notes?`, `project_id?`. Registra Embarcação; com `project_id`, vincula como principal à Expedição.

### `propose_context_pack`

Input: `project_id`, `title` (3–180), `objective?`. Cria Rumo em `draft` numa Expedição existente. Não aprova.

### `get_context_pack`

Serve só revisão `approved` + validade `current`. Senão:

```json
{ "ok": false, "code": "pack_not_servable", "reasons": ["needs_review"], "packId": "...", "revisionId": null }
```

### `get_implementation_brief`

`mode`: `brief` | `full`. Sempre inclui `packId` e `revisionId`.

### Manobras

`claim_implementation_task`, `renew_implementation_task_lease`, `release_implementation_task` — lease atômico (RN-103). `report_implementation_progress` e `report_implementation_result` exigem resumo não vazio (RN-108). Resultado reportado não é aceite humano. Manobra de código exige Embarcação reconhecida na sessão (RN-105).

### Conversas de bordo (RN-109)

`create_coordination_message` abre fio ou responde:

**Nova Conversa:**

```json
{
  "subject_type": "pack",
  "subject_id": "uuid-rumo",
  "body": "Pergunta para o bordo",
  "is_blocker": false
}
```

**Maré contrária** (tipo escolhido **só na abertura**):

```json
{
  "subject_type": "task",
  "subject_id": "uuid-manobra",
  "body": "Checkout bloqueado até credencial de staging",
  "is_blocker": true
}
```

Em Manobra (`subject_type: "task"`), `is_blocker: true` põe status `blocked` até `resolve_coordination_thread`. Responder fio existente usa `thread_id` + `body` — **sem** `is_blocker`.

`resolve_coordination_thread`: `{ "thread_id": "...", "resolved": true }`.

Instruções do servidor MCP: token preso a um porto (RN-55); em dev, `get_agent_bootstrap` primeiro; `publish_document` gera versão; `visibility` controla quem lê cartas.
