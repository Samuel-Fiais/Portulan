<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:portulan-agent-rules -->

## Portulan — skill e MCP

Este projeto inclui a skill **portulan-mcp** em `.cursor/skills/portulan-mcp/`.

Quando a tarefa envolver documentos da biblioteca, MCP, publicação com link `/p/{id}`, ou ferramentas `list_documents` / `create_document` / `publish_document`, **leia e siga** `.cursor/skills/portulan-mcp/SKILL.md` antes de agir.

| Recurso | Caminho |
|---|---|
| Skill (agente) | `.cursor/skills/portulan-mcp/SKILL.md` |
| Referência MCP | `.cursor/skills/portulan-mcp/reference.md` |
| Config MCP Cursor | `.cursor/mcp.json` |
| Endpoint (dev) | `http://localhost:3000/api/mcp` |

Requisito: `npm run dev` rodando para o MCP responder.

<!-- END:portulan-agent-rules -->
