# Funcionalidades

O que o produto **faz** e o que **fará**. Estado: `existe` · `parcial` · `planejado`.

Planejados apontam o id do [backlog ICE](../../.cursor/skills/portulan-ice/backlog.md). Ao entregar, mude o estado aqui e lá.

## Biblioteca

| ID | Capacidade | Estado |
|---|---|---|
| F-biblioteca | Listar documentos do usuário e compartilhados, com busca local em título/resumo/tags | existe |
| F-filtro-template | Filtrar a lista por template | existe |
| F-filtro-status | Filtrar por rascunho / revisão / publicado / arquivado; cards de resumo clicáveis | planejado (`status-filter`) |
| F-busca-corpo | Buscar também no conteúdo (UI e MCP) | planejado (`content-search`) |
| F-stats | Contar documentos, publicados, em revisão, rascunhos | existe |

## Editor

| ID | Capacidade | Estado |
|---|---|---|
| F-editar | Título, resumo, Markdown, metadados, template; prévia lado a lado | existe |
| F-componentes | Inserir bloco do catálogo no cursor | existe |
| F-salvar | Persistir rascunho sob demanda | existe |
| F-autosave | Debounce + Cmd/Ctrl+S + aviso ao sair | planejado (`autosave`) |
| F-atalhos-md | Cmd/Ctrl+B, I, K e atalho para a modal de componentes | planejado (`md-shortcuts`) |
| F-prever | Abrir rascunho em outra aba | existe |
| F-pdf | Exportar PDF A4 com cabeçalho/rodapé | existe |
| F-export-md | Baixar o Markdown fonte | planejado (`export-md`) |
| F-duplicar | Clonar como rascunho novo (UI) | existe |
| F-duplicar-mcp | O mesmo via MCP | planejado (`mcp-duplicate`) |

## Publicação

| ID | Capacidade | Estado |
|---|---|---|
| F-publicar | Gerar release imutável, copiar `/d/{slug}` | existe |
| F-historico | Listar versões, copiar `/d` e `/p`, desativar versão | existe |
| F-restaurar | Copiar uma release de volta para o rascunho | planejado (`restore-release`) |
| F-diff-versoes | Comparar rascunho vs release ou duas releases | planejado (`version-diff`) |
| F-slug-estavel | Slug não muda com o título após publicar; edição explícita | planejado (`stable-slug`) |
| F-desativar-doc | Desligar todos os links públicos sem excluir | existe |

## Leitura

| ID | Capacidade | Estado |
|---|---|---|
| F-publico | `/d/{slug}` última versão; `/p/{id}` versão fixa | existe |
| F-tema | Alternar claro/escuro na vista pública | existe |
| F-indice | TOC com âncoras em `##` / `###` | planejado (`toc-anchors`) |
| F-mermaid | Renderizar fence ` ```mermaid ` com paleta do template | planejado (`mermaid`) |
| F-living | Checklist, gráficos e blocos interativos na leitura | existe (checklist só no navegador) |

## Colaboração

| ID | Capacidade | Estado |
|---|---|---|
| F-compartilhar | Convidar por e-mail como leitor ou editor | existe |
| F-comentarios | Painel de revisão no editor, âncora opcional à seção | planejado (`review-comments`) |

## Templates e identidade

| ID | Capacidade | Estado |
|---|---|---|
| F-templates | Criar/editar/duplicar template particular; Default interno | existe |
| F-logo | Logo do template e upload de imagens de relatório (Blob) | existe |
| F-auth | Login GitHub | existe |
| F-mcp-token | Gerar e revogar token pessoal MCP | existe |

## Agentes

| ID | Capacidade | Estado |
|---|---|---|
| F-mcp-docs | listar, ler, criar, editar, publicar, desativar, excluir documentos | existe |
| F-mcp-templates | CRUD e preview de templates | existe |
| F-mcp-share | listar, convidar, revogar compartilhamentos | existe |
| F-mcp-catalogo | listar e explicar componentes Markdown | existe |
