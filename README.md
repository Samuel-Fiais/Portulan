# Festpay Docs

Workspace editorial para criar, revisar, publicar e imprimir documentos técnicos. Construído com Next.js App Router, React, Tailwind CSS, shadcn/ui, SQLite e MCP Streamable HTTP.

## Executar localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. O banco é criado automaticamente em `data/festpay-docs.sqlite` e recebe três documentos de exemplo na primeira execução.

## Configuração

Copie `.env.example` para `.env.local` quando precisar alterar o caminho do SQLite ou proteger o MCP:

```dotenv
DATABASE_PATH=/caminho/absoluto/festpay-docs.sqlite
MCP_API_KEY=uma-chave-segura
```

Quando `MCP_API_KEY` estiver definida, envie `Authorization: Bearer <chave>` ao endpoint MCP.

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

Ferramentas disponíveis:

- `list_documents`: pesquisa e filtra a biblioteca;
- `get_document`: lê um documento completo por ID ou slug;
- `create_document`: cria documentos em Markdown;
- `update_document`: aplica alterações parciais e incrementa a versão;
- `publish_document`: publica a versão atual e retorna o link público `/p/{id}`;
- `list_document_releases`: lista links públicos já gerados por versão;
- `delete_document`: remove um documento pelo ID.

Configuração no Cursor (já incluída em `.cursor/mcp.json` do projeto):

```json
{
  "mcpServers": {
    "festpay-docs": {
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
| `.cursor/skills/festpay-docs-mcp/SKILL.md` | Instruções da skill (Cursor) |
| `.cursor/skills/festpay-docs-mcp/reference.md` | Schemas e exemplos detalhados |
| `festpay-docs-mcp-skill.md` | Guia completo consolidado (download) |
| `festpay-docs-mcp-skill.zip` | Pacote com os três arquivos acima |

No chat do Cursor: *“use a skill festpay-docs-mcp”*.

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

## Persistência em produção

### Modo atual: SQLite efêmero

A app detecta automaticamente se o filesystem é somente leitura (como em Vercel/serverless) e usa `/tmp` para o banco SQLite. Isso permite que o app funcione, mas **os dados são perdidos entre deploys e podem variar entre instâncias**.

### Opção 1: Filesystem persistente

Use uma plataforma com disco persistente (Railway, Fly.io, VPS) ou monte um volume para o diretório `data/`.

### Opção 2: Turso/libSQL (recomendado para serverless)

Para persistência durável em Vercel, migre para [Turso](https://turso.tech):

1. Crie um database: `turso db create festpay-docs`
2. Obtenha a URL: `turso db show festpay-docs --url`
3. Crie um token: `turso db tokens create festpay-docs`
4. Configure em Vercel:
   ```bash
   vercel env add TURSO_DATABASE_URL
   vercel env add TURSO_AUTH_TOKEN
   ```

**Nota**: A migração para Turso requer refatoração das queries para serem async (libsql é async, better-sqlite3 é sync). O suporte está preparado mas não ativado por padrão.
