# Backlog ICE — Portulan

Fonte: sessão 4 set. 2026. Score = (I × C × E) / 10.

Atualize este arquivo quando o ranking mudar. Não reexplore o repo inteiro para recriar esta tabela.

## Ranking atual

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | autosave | Autosave, Cmd/Ctrl+S e aviso ao sair | Editor | 9 | 9 | 8 | 64.8 | proposto |
| 2 | stable-slug | Slug estável e editável | Publicação | 9 | 10 | 7 | 63.0 | proposto |
| 3 | status-filter | Filtro por status na biblioteca | Biblioteca | 6 | 10 | 10 | 60.0 | proposto |
| 4 | export-md | Download do Markdown fonte | Editor | 6 | 10 | 10 | 60.0 | proposto |
| 5 | restore-release | Restaurar versão publicada no rascunho | Publicação | 8 | 9 | 8 | 57.6 | proposto |
| 6 | toc-anchors | Índice navegável com âncoras | Leitura | 9 | 9 | 7 | 56.7 | proposto |
| 7 | mcp-duplicate | `duplicate_document` no MCP | MCP | 6 | 9 | 9 | 48.6 | proposto |
| 8 | content-search | Busca no corpo do documento | Biblioteca | 8 | 8 | 7 | 44.8 | proposto |
| 9 | md-shortcuts | Atalhos de formatação no editor | Editor | 7 | 8 | 8 | 44.8 | proposto |
| 10 | mermaid | Diagramas Mermaid | Leitura | 8 | 8 | 6 | 38.4 | proposto |
| 11 | version-diff | Diff entre versões | Publicação | 8 | 8 | 6 | 38.4 | proposto |
| 12 | review-comments | Comentários de revisão | Colaboração | 8 | 8 | 5 | 32.0 | proposto |

## Escopo (não redescobrir)

- **autosave** — Debounce no rascunho, Cmd/Ctrl+S, `beforeunload`. Não muda Publicar.
- **stable-slug** — Hoje `updateDocument` regenera slug ao mudar o título e quebra `/d/{slug}` e `:::report`. Congelar após primeira publicação; campo em Metadados.
- **status-filter** — MCP já filtra; a home não. Select + cards de resumo clicáveis.
- **export-md** — PDF existe; falta baixar o `.md`.
- **restore-release** — Histórico só abre/copia/desativa. Restaurar snapshot no rascunho.
- **toc-anchors** — `##` sem `id`, sem TOC em `/d` e `/p`.
- **mcp-duplicate** — UI duplica; MCP não.
- **content-search** — Busca da home ignora `content`; MCP também.
- **md-shortcuts** — Textarea sem Cmd+B/I/K.
- **mermaid** — Catálogo não renderiza flowchart/sequência/estado. Fence ` ```mermaid `, paleta do template, SVG na prévia/público/PDF.
- **version-diff** — Comparar rascunho vs release, ou duas releases.
- **review-comments** — Status “Em revisão” sem conversa. Painel no editor para quem tem acesso; âncora opcional à `##`. Sem comentário anônimo em `/p`.

## Fora de propósito

| Item | Por quê |
|---|---|
| Checklist living no servidor | `:::checklist` já existe; estado só em localStorage. Não pedido nesta leva. |
| E-mail de convite | Exige provedor; não desbloqueia revisão. Comentários no documento, sim. |
| Colaboração simultânea / CRDT | Custo alto demais para o desenho atual. |

## Já existe (não listar de novo)

Editor Markdown + prévia, catálogo de diretivas `:::`, templates com paleta/logo, publicar com `/d/{slug}` e `/p/{id}`, compartilhar leitor/editor, MCP (docs/templates/componentes), PDF, duplicar na UI, desativar documento/versão, upload de imagem (Blob), checklist living em localStorage, card `:::report`.
