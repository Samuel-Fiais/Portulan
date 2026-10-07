---
name: portulan-ice
description: Ranks Portulan product improvements with ICE (Impact, Confidence, Ease) and maintains the living backlog. Use when the user asks for melhorias, ICE, backlog, score de funcionalidades, or what to build next in Portulan.
---

# Portulan ICE

Não reexplore o produto inteiro. O backlog e o mapa abaixo são a memória entre sessões.

## Antes de inspecionar código

1. Leia `docs/product/README.md` e o arquivo da superfície (regras / funcionalidades). Só então [backlog.md](backlog.md).
2. Inspecione **somente** os arquivos da superfície nova que o usuário nomeou (mapa abaixo), e só se o modelo de produto não responder.
3. Não re-pontue itens já listados, salvo se o usuário pedir recálculo ou o comportamento daquele item tiver mudado.

## Fórmula

Cada eixo é 1–10. Facilidade alta = implementação mais barata.

```
Score = (Impacto × Confiança × Facilidade) / 10
```

- **Impacto**: fecha um buraco real para autor, leitor ou agente.
- **Confiança**: o gap está visível no código (não é hipótese).
- **Facilidade**: cabe no desenho atual, sem infra nova (e-mail, CRDT, etc.).

Critério: só entra o que o código hoje não faz e que cabe no produto. Não inflar nota de item pedido pelo usuário — pontuar com honestidade e incluir mesmo assim.

## Mapa (onde olhar)

| Superfície | Arquivos |
|---|---|
| Workspace | `components/workspace-sidebar.tsx`, `app/(workspace)/` |
| Porto (workspaces) | `lib/workspaces.ts`, `lib/workspace-policy.ts`, `lib/db/workspaces.ts`, `lib/active-workspace.ts`, `app/workspace-actions.ts`, `components/workspace-panel.tsx`, `components/workspace-switcher.tsx` |
| Cartoteca | `components/library-panel.tsx`, `lib/db/documents.ts` (`listDocuments`) |
| Editor | `components/document-editor.tsx`, `app/actions.ts` |
| Markdown / blocos | `lib/markdown-components.ts`, `components/rich-markdown.tsx` |
| Publicação / versões | `lib/db/documents.ts` (`publishDocument`, `documentReleases`), aba Histórico no editor |
| Leitura pública | `components/public-document-view.tsx`, `components/report-preview.tsx`, `app/d/`, `app/p/` |
| Compartilhar / visibilidade | `lib/document-share-policy.ts`, `lib/workspace-policy.ts`, `components/document-share-dialog.tsx` |
| Gabaritos | `components/templates-panel.tsx`, `lib/db/templates.ts` |
| MCP | `app/api/mcp/route.ts`, `lib/mcp-tool-catalog.ts`, `.cursor/skills/portulan-mcp/SKILL.md`, `components/mcp-tokens-panel.tsx` |
| Checklist living | `components/living-checklist.tsx`, `lib/living-document-storage.ts` (hoje: localStorage) |

## Saída

1. Atualize a tabela em [backlog.md](backlog.md) (ranking, eixos, escopo, fora-de-escopo).
2. Atualize o canvas `ice-melhorias-documentos.canvas.tsx` se existir neste workspace.
3. Responda com a tabela ordenada por Score. Não implemente até o usuário pedir.

## Prompt curto (usuário)

> ICE para o editor  
> use a skill portulan-ice  
> Recalcule o ICE do Mermaid
