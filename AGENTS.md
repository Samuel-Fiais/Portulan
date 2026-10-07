<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:portulan-agent-rules -->

## Portulan — skill e MCP

Este projeto inclui a skill **portulan-mcp** em `.cursor/skills/portulan-mcp/`.

Quando a tarefa envolver MCP do Portulan — cartas, gabaritos, publicação (`/d`, `/p`), compartilhamento ou comentários — **leia e siga** `.cursor/skills/portulan-mcp/SKILL.md` antes de agir.

| Recurso | Caminho |
|---|---|
| Skill (agente) | `.cursor/skills/portulan-mcp/SKILL.md` |
| Referência MCP | `.cursor/skills/portulan-mcp/reference.md` |
| Config MCP Cursor | `.cursor/mcp.json` |
| Endpoint (cloud) | `https://portulan.vercel.app/api/mcp` |
| Endpoint (dev local) | `http://localhost:3000/api/mcp` |

Requisito: `npm run dev` rodando para o MCP responder.

## Léxico da UI

A copy em pt-BR usa o vocabulário náutico; o código mantém os nomes técnicos. Não renomeie identificadores, rotas ou ferramentas MCP para acompanhar a copy.

| UI | Código |
|---|---|
| Carta | `document` |
| Cartoteca | `/library` |
| Gabarito | `template` · `/templates` |
| Porto · Tripulação | `workspace` · `/workspace` · `workspaceMembers` |
| Cartógrafo · Frota | `author` · `team` |
| Camarote · Porto · Mar aberto | `visibility`: `private` · `workspace` · `public` |

## Portos (workspaces)

Todo acervo é do porto ativo. Antes de mexer em tripulação, papéis, convites, visibilidade de carta ou exclusão de porto, valide com `lib/workspace-policy.ts` — ele é a fonte das travas (capitão único, imediato não mexe em imediato, porto inicial não sai, porto com cartas não é excluído, só o cartógrafo muda visibilidade). O porto ativo da sessão vem de `lib/active-workspace.ts`; contextos de acesso saem de `lib/access-context.ts`.

## Compartilhamento

Nada pode ser compartilhado se não fizer sentido. Antes de convidar ou alterar acesso, valide com `lib/document-share-policy.ts` (ou a lógica equivalente no servidor): não compartilhe com o cartógrafo, não duplique convites e não aplique mudanças de papel idênticas. Convidado fora da tripulação do porto da carta é sinalizado como **externo** (RN-93).

## Componentes de relatório

Novos blocos Markdown vão em `lib/markdown-components.ts`. A modal **Adicionar componente** lê o catálogo automaticamente via `groupMarkdownComponentsByCategory` — não duplique listas de categorias no editor.

## ICE / backlog de produto

Quando a tarefa for levantar, pontuar ou priorizar melhorias (ICE, backlog, “o que construir”), **leia e siga** `.cursor/skills/portulan-ice/SKILL.md`. O ranking vigente está em `.cursor/skills/portulan-ice/backlog.md` — não reexplore o repositório inteiro para recriá-lo.

## Modelo de produto

A descrição de negócio (entidades, regras `RN-xx`, funcionalidades `F-…`, fluxos) vive em `docs/product/`. **Leia esses arquivos em vez de redescobrir o sistema no código.** Qualquer mudança de comportamento atualiza `docs/product/` na mesma sessão — ver `.cursor/rules/portulan-product.mdc`.

<!-- END:portulan-agent-rules -->

<!-- BEGIN:portulan-agent-setup -->
## Portulan — contexto de desenvolvimento

Setup: skill `portulan-mcp` (seção **Setup com chave do responsável**) ou Guia do Agente.

1. O **humano** gera `ptl_…` no modal da conta e cola o **Guia do Agente** no chat (só isso).
2. O **agente** configura MCP e `export PORTULAN_TOKEN`, e testa o endpoint.
3. Chame `get_system_guide` e `list_workspaces` antes de editar cartas.
4. Nunca grave token, segredo ou path absoluto neste repositório (RN-106).
<!-- END:portulan-agent-setup -->
