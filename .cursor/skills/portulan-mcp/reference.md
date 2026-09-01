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

Incrementa `version` a cada alteração persistida.

---

### `publish_document`

**Input:**

```json
{
  "id": "uuid-ou-slug",
  "content": "opcional — publica já com alterações pendentes"
}
```

Se `content`/metadados mudarem, salva e incrementa versão antes de publicar.

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
