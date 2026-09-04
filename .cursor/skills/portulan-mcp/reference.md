# Portulan Docs MCP — Referência

## Implementação no projeto

| Item | Caminho |
|---|---|
| Handler MCP | `app/api/mcp/route.ts` |
| Banco SQLite | `lib/db.ts` → `data/portulan.sqlite` |
| Tipos e templates | `lib/documents.ts` |
| Validação Zod | `lib/validation.ts` |
| Config Cursor | `.cursor/mcp.json` |
| Página pública | `app/p/[releaseId]/page.tsx` |

Variáveis de ambiente (`.env.example`):

```dotenv
DATABASE_PATH=
MCP_API_KEY=
```

---

## Ferramentas — schemas e exemplos

### `list_templates`, `get_template`, `create_template`, `update_template`, `duplicate_template`, `preview_template`, `delete_template`

`list_templates` retorna templates internos e os templates particulares do usuário, incluindo `id`, `name`, `primaryColor`, `secondaryColor` e `content`.

`get_template` recebe `{ "id": "..." }` e retorna o template completo quando o usuário tem acesso.

`duplicate_template` recebe `{ "id": "...", "name": "opcional" }` e cria um clone particular com novo id.

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

---

### `publish_document`

**Input:**

```json
{
  "id": "uuid-ou-slug",
  "content": "opcional — publica já com alterações pendentes"
}
```

Cria uma nova versão publicada e um snapshot imutável, usando o rascunho atual junto de qualquer campo enviado.

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

URL completa em dev: `http://localhost:3000/d/{slug}` (última versão) ou `http://localhost:3000/p/{release.id}` (versão fixa)

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
- Instruções do servidor: preferir atualizar documentos existentes; usar `publish_document` para links públicos

---

## Erros comuns do agente

1. **Duplicar documentos** — sempre `list_documents` + `get_document` antes de `create_document`.
2. **Esperar link sem publicar** — `update_document` com `status: "published"` não gera `/p/{id}`; use `publish_document`.
3. **Editar link antigo** — releases são imutáveis; publique nova versão para novo link.
4. **Slug no delete** — `delete_document` rejeita slug; use UUID.
5. **Conteúdo sem `##`** — diretivas funcionam, mas seções editoriais ficam melhor com `## 01 — Título`.
