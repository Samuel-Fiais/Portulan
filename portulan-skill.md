---
name: portulan-mcp
description: Operates the Portulan MCP server to list, read, create, update, publish, and delete technical documents. Use when maintaining the Portulan document library via MCP, publishing share links at /p/{id}, or working with Markdown docs through any MCP client.
---

# Portulan MCP

Guia para agentes operarem a biblioteca técnica **Portulan** via MCP Streamable HTTP.

## Pré-requisitos

1. App Portulan acessível (ex.: `https://seu-dominio.com` ou `http://localhost:3000` em desenvolvimento)
2. Endpoint MCP: `{origin}/api/mcp`
3. Servidor MCP: `portulan` v0.8.0
4. Conta Portulan com login GitHub e **token MCP pessoal**

Sem o app rodando ou sem token válido, conexões falham (timeout ou 401).

## Autenticação (obrigatória)

O MCP opera **como o usuário Portulan**, não como chave global compartilhada.

1. Faça login no Portulan com GitHub
2. Abra **Integrações → MCP** no dashboard
3. Clique em **Gerar token MCP**
4. Copie o token (`ptl_…`) — ele só é exibido uma vez
5. Envie em **toda** requisição MCP:

```http
Authorization: Bearer ptl_<seu-token>
```

Em clientes MCP que suportam headers HTTP, configure:

```json
{
  "mcpServers": {
    "portulan": {
      "url": "https://seu-dominio.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ptl_<seu-token>"
      }
    }
  }
}
```

Se o cliente só suporta stdio, use um proxy HTTP como `mcp-remote`:

```json
{
  "mcpServers": {
    "portulan": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://seu-dominio.com/api/mcp", "--header", "Authorization: Bearer ptl_<seu-token>"]
    }
  }
}
```

Revogue tokens comprometidos no dashboard a qualquer momento.

## Ferramentas (19)

| Ferramenta | Quando usar |
|---|---|
| `get_system_guide` | **Primeiro** quando não souber como escrever conteúdo — guia completo gerado do catálogo (inclui **Como evitar erros**) |
| `upload_image` | Enviar imagem (base64) para um documento; usar a `url` em `:::figure{src=...}` |
| `upload_file` | Enviar anexo (base64) para um documento; usar `url` e `name` em `:::file{url=... name=...}` |
| `list_templates` | Descobrir templates disponíveis (cores editoriais) |
| `get_template` | Ler template completo (cores + conteúdo-base) |
| `duplicate_template` | Clonar template acessível como template particular |
| `preview_template` | Resumo leve do conteúdo-base de um template |
| `list_markdown_components` | Catálogo de diretivas `:::` e Markdown |
| `explain_markdown_component` | Sintaxe e exemplos de um componente |
| `list_documents` | Descobrir o que existe; buscar por título, tag, template ou status |
| `get_document` | Ler conteúdo completo antes de editar |
| `create_document` | Assunto novo, sem documento equivalente |
| `update_document` | Editar rascunho/revisão; **incrementa versão** |
| `publish_document` | Gerar link público imutável da versão atual |
| `list_document_releases` | Recuperar links `/p/{id}` já publicados |
| `delete_document` | Remover definitivamente (só UUID) |

Respostas são JSON em `content[0].text`. Erros usam `isError: true`.

## Modelo de dados

### Templates

Cada documento usa um **template** com `id`, `name`, `primaryColor` e `secondaryColor`. O template **Default** usa as cores Portulan (navy + burgundy). Use `list_templates` antes de `create_document`.

### Status (`status`)

| Valor | Significado |
|---|---|
| `draft` | Rascunho |
| `review` | Em revisão |
| `published` | Publicado na biblioteca |
| `archived` | Arquivado |

### Versão e publicação

- `update_document` incrementa `version` quando há mudança de conteúdo/metadados.
- `publish_document` cria snapshot imutável em `document_releases` e retorna `publicPath: "/p/{releaseId}"`.
- Links antigos **não mudam** quando o documento é editado depois; nova publicação = novo link.
- Link público: `{origin}/p/{releaseId}` (sem autenticação).

### Identificadores

- `get_document`, `list_document_releases`, `publish_document`: aceitam **ID UUID ou slug**.
- `delete_document`: exige **UUID** (`id` do documento).
- Após `create_document`, guarde o `id` retornado.

## Fluxos recomendados

### Criar documento novo

```
1. list_templates → escolher template_id
2. list_documents (query opcional) → confirmar que não existe equivalente
3. create_document → template_id + title + content (+ summary, tags, author, team)
4. publish_document (se link compartilhável for necessário)
```

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
| `:::checklist` | Tarefas com `- [ ]` ou `- [x]` · subtítulo opcional após `\|` |
| `:::testcase{id="PRD-01" status="pending" priority="high" title="…"}` | Cenário de QA com status durável (pending · ok · partial · error) |
| `:::kv` | `- chave \| valor` |
| `:::progress` | `- label \| 0-100 \| ok\|warn\|err\|a2` |

Variantes de alert: `info`, `success`, `warning`, `error`, `accent`.

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
| `CONNECTION_CLOSED` | App parado | Subir o app Portulan |
| `401 Token MCP ausente` | Sem header Bearer | Gerar token no dashboard |
| `401 Token inválido` | Token revogado ou errado | Gerar novo token |
| `Documento não encontrado` | ID/slug errado ou outro usuário | `list_documents` |
| Ferramentas não aparecem | MCP desconectado | Reiniciar cliente MCP |

Teste manual:

```bash
curl -sS -X POST https://seu-dominio.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer ptl_<seu-token>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Deve listar 16 ferramentas.

## API HTTP (alternativa ao MCP)

Mesma biblioteca, autenticada por sessão GitHub (cookies), sem MCP:

- `GET /api/documents?q=&template_id=&status=`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`

Use MCP quando o agente precisa de ferramentas tipadas; use HTTP para integrações custom com sessão web.
