# Portulan

Workspace editorial para criar, revisar, publicar e imprimir cartas técnicas (documentos), organizado em **portos** com tripulação própria. Construído com Next.js App Router, React, Tailwind CSS, shadcn/ui, Postgres (Neon/Drizzle) e MCP Streamable HTTP.

## Executar localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. O schema é aplicado automaticamente no banco configurado e cada conta ganha o porto inicial na primeira entrada.

## Configuração

Copie `.env.example` para `.env.local` e configure `DATABASE_URL` (Neon Postgres) e as variáveis Auth.js (`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL`).

### Autenticação MCP (por usuário)

1. Faça login no Portulan com GitHub ou com handle/e-mail e senha
2. Confira no trilho em que porto você está — o token fica preso a ele
3. Abra o modal da conta e gere uma chave MCP
4. Envie o token em toda requisição ao endpoint MCP: `Authorization: Bearer ptl_<seu-token>`

## MCP para agentes

Endpoint local:

```text
http://localhost:3000/api/mcp
```

Exemplo de configuração de cliente:

```json
{
  "mcpServers": {
    "festpay-docs": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Ferramentas disponíveis (31): portos (`list_workspaces`); cartas (`list_documents`, `get_document`, `create_document`, `update_document`, `duplicate_document`, `delete_document`, `publish_document`, `list_document_releases`, `update_document_release`, `restore_document`); gabaritos (`list_templates`, `get_template`, `create_template`, `update_template`, `duplicate_template`, `preview_template`, `delete_template`); compartilhamento (`list_document_shares`, `share_document`, `update_document_share`, `revoke_document_share`); comentários (`list_document_comments`, `create_document_comment`, `resolve_document_comment`, `delete_document_comment`); mídia (`upload_image`, `upload_file`); catálogo (`list_markdown_components`, `explain_markdown_component`, `get_system_guide`).

Configuração no Cursor (já incluída em `.cursor/mcp.json` do projeto):

```json
{
  "mcpServers": {
    "portulan": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

O app precisa estar rodando (`npm run dev`) para o MCP responder. Se `MCP_API_KEY` estiver definida, adicione o header `Authorization: Bearer <chave>` na configuração do cliente.

## Skill do agente (MCP)

Guia para agentes operarem a biblioteca via MCP:

| Arquivo | Uso |
|---|---|
| `.cursor/skills/portulan-mcp/SKILL.md` | Instruções da skill (Cursor) |
| `.cursor/skills/portulan-mcp/reference.md` | Schemas e exemplos detalhados |
| `portulan-mcp-skill.md` | Guia completo consolidado (download) |
| `portulan-mcp-skill.zip` | Pacote com os três arquivos acima |

No chat do Cursor: *“use a skill portulan-mcp”*.

## API HTTP

- `GET /api/documents?q=&type=&status=`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`

## Impressão

Abra um documento e use **Imprimir**. A folha de impressão é A4 e diferente da tela do editor: navegação e controles são removidos; títulos evitam ficar órfãos; tabelas, código, callouts, linhas e itens de lista evitam quebras internas; cores são preservadas.

## Validação

```bash
npm run typecheck
npm run lint
npm run build
```

O build usa Webpack para funcionar também em ambientes gerenciados que bloqueiam a porta interna usada pelo Turbopack durante a transformação de CSS.

## Persistência

O banco é Neon Postgres, schema `portulan`. O bootstrap da aplicação cria e altera só as tabelas que o produto ainda usa. Ele não apaga tabelas antigas.

## Migrações manuais

Depois que o deploy só de cartas estiver no ar, aplique à mão `db/migrations/2026-10-06-drop-legacy-modules.sql`. O script só mexe no schema `portulan` e remove tabelas que o código já não cria. Não rode esse arquivo como parte do build nem do bootstrap.
