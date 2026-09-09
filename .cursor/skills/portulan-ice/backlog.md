# Backlog ICE — Portulan

Fonte: sessão 4 set. 2026. Score = (I × C × E) / 10.

Atualize este arquivo quando o ranking mudar. Não reexplore o repo inteiro para recriar esta tabela.

## Ranking atual

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | autosave | Autosave, Cmd/Ctrl+S e aviso ao sair | Editor | 9 | 9 | 8 | 64.8 | entregue |
| 2 | stable-slug | Slug UUID estável; título renomeável | Publicação | 9 | 10 | 7 | 63.0 | entregue |
| 3 | status-filter | Filtro por status na biblioteca | Biblioteca | 6 | 10 | 10 | 60.0 | entregue |
| 4 | export-md | Download do Markdown fonte | Editor | 6 | 10 | 10 | 60.0 | entregue |
| 6 | toc-anchors | Índice navegável com âncoras | Leitura | 9 | 9 | 7 | 56.7 | entregue |
| 7 | mcp-duplicate | `duplicate_document` no MCP | MCP | 6 | 9 | 9 | 48.6 | entregue |
| 8 | content-search | Busca no corpo do documento | Biblioteca | 8 | 8 | 7 | 44.8 | entregue |
| 9 | md-shortcuts | Atalhos de formatação no editor | Editor | 7 | 8 | 8 | 44.8 | entregue |
| 11 | version-diff | Diff entre versões | Publicação | 8 | 8 | 6 | 38.4 | entregue |
| 12 | review-comments | Comentários de revisão | Colaboração | 8 | 8 | 5 | 32.0 | entregue |

## Entregue fora do ranking proposto

| ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|
| workspace-nav | Dashboard, telas separadas e sidebar | Workspace | 7 | 10 | 7 | 49.0 | entregue |
| mermaid | Diagramas Mermaid na prévia, público e PDF | Leitura | 8 | 8 | 6 | 38.4 | entregue |
| restore-release | Restaurar versão publicada no rascunho | Publicação | 8 | 9 | 8 | 57.6 | entregue |

## Escopo (não redescobrir)

- **autosave** — Debounce no rascunho, Cmd/Ctrl+S, `beforeunload`. Não muda Publicar.
- **stable-slug** — Slug é UUID fixo na criação (`/d/{uuid}`); renomear título não altera o link. Slugs legados (título) redirecionam via `document_slug_aliases`.
- **status-filter** — Select de status na Biblioteca (`/biblioteca?status=…`); cards do dashboard levam ao filtro correspondente (inclui arquivados).
- **export-md** — Menu do editor: **Baixar Markdown** salva o rascunho se necessário e baixa `{slug}.md`.
- **toc-anchors** (entregue) — `##`/`###` com `id` estável; TOC navegável na capa de `/d` e `/p`.
- **mcp-duplicate** — `duplicate_document` no MCP; mesmo comportamento da UI (rascunho novo, só responsável).
- **content-search** — Biblioteca e `list_documents` buscam também no corpo Markdown do rascunho.
- **md-shortcuts** — Cmd/Ctrl+B/I/K no textarea; Cmd/Ctrl+Shift+C abre a modal de componentes.
- **version-diff** (entregue) — Comparar rascunho vs release ou duas releases. Aba Histórico: diff de metadados e Markdown, com seleção de base/comparação.
- **review-comments** (entregue) — Aba Revisão no editor para quem tem acesso; âncora opcional à `##`. Sem comentário em `/p`.
- **workspace-nav** (entregue) — Home monolítica virou Dashboard `/`, Biblioteca `/biblioteca`, Templates `/templates`, Integrações `/integrations`, com sidebar. Editor e `/d`/`/p` fora da chrome.

## Fora de propósito

| Item | Por quê |
|---|---|
| Checklist living no servidor | `:::checklist` já existe; estado só em localStorage. Não pedido nesta leva. |
| E-mail de convite | Exige provedor; não desbloqueia revisão. Comentários no documento, sim. |
| Colaboração simultânea / CRDT | Custo alto demais para o desenho atual. |

## Já existe (não listar de novo)

Editor Markdown + prévia, catálogo de diretivas `:::`, templates com paleta/logo, publicar com `/d/{slug}` e `/p/{id}`, compartilhar leitor/editor, MCP (docs/templates/componentes), PDF, download do Markdown fonte (`.md`), duplicar na UI, desativar documento/versão, upload de imagem (Blob), checklist living em localStorage, card `:::report`, diagramas Mermaid (` ```mermaid `), workspace autenticado com sidebar (Dashboard, Biblioteca, Templates, Integrações).
