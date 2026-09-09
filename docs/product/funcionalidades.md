# Funcionalidades

O que o produto **faz** e o que **fará**. Estado: `existe` · `parcial` · `planejado`.

Planejados apontam o id do [backlog ICE](../../.cursor/skills/portulan-ice/backlog.md). Ao entregar, mude o estado aqui e lá.

## Workspace

| ID | Capacidade | Estado |
|---|---|---|
| F-navegacao | Trilho de ícones com tooltips no desktop; drawer com rótulos no viewport estreito | existe |
| F-dashboard | Resumo da biblioteca, documentos recentes, novo documento e atalhos para as outras telas | existe |

## Biblioteca

| ID | Capacidade | Estado |
|---|---|---|
| F-biblioteca | Listar documentos do usuário e compartilhados, com busca local em título/resumo/tags/conteúdo, em tela própria | existe |
| F-filtro-template | Filtrar a lista por template | existe |
| F-filtro-status | Filtrar por rascunho / revisão / publicado / arquivado; cards de resumo clicáveis | existe |
| F-busca-corpo | Buscar também no conteúdo (UI e MCP) | existe |
| F-stats | Contar documentos, publicados, em revisão, rascunhos e arquivados (no dashboard); cards levam à biblioteca filtrada | existe |

## Editor

| ID | Capacidade | Estado |
|---|---|---|
| F-editar | Título, resumo, Markdown, metadados, template; prévia lado a lado | existe |
| F-componentes | Inserir bloco do catálogo no cursor | existe |
| F-salvar | Persistir rascunho sob demanda | existe |
| F-autosave | Debounce + Cmd/Ctrl+S + aviso ao sair | existe |
| F-atalhos-md | Cmd/Ctrl+B, I, K no textarea; Cmd/Ctrl+Shift+C abre a modal de componentes | existe |
| F-prever | Abrir rascunho em outra aba | existe |
| F-pdf | Exportar PDF A4 com cabeçalho/rodapé | existe |
| F-export-md | Baixar o Markdown fonte como `.md` no menu do editor | existe |
| F-duplicar | Clonar como rascunho novo (UI) | existe |
| F-duplicar-mcp | O mesmo via MCP (`duplicate_document`) | existe |

## Publicação

| ID | Capacidade | Estado |
|---|---|---|
| F-publicar | Gerar release imutável, copiar `/d/{uuid}` | existe |
| F-historico | Listar versões, copiar `/d` e `/p`, desativar versão, restaurar release no rascunho | existe |
| F-restaurar | Copiar uma release de volta para o rascunho | existe |
| F-diff-versoes | Comparar rascunho vs release ou duas releases (aba Histórico), com legenda, contagem e restauração no modal | existe |
| F-slug-estavel | Slug UUID fixo na criação; título renomeável sem alterar `/d/{uuid}` | existe |
| F-desativar-doc | Desligar todos os links públicos sem excluir | existe |

## Leitura

| ID | Capacidade | Estado |
|---|---|---|
| F-publico | `/d/{uuid}` última versão; `/p/{id}` versão fixa | existe |
| F-tema | Alternar claro/escuro na vista pública | existe |
| F-indice | TOC com âncoras em `##` / `###` na prévia do editor, prévia de rascunho, `/d`, `/p` e PDF | existe |
| F-mermaid | Renderizar fence ` ```mermaid ` com paleta do template (flowchart, sequência, estado) na prévia, leitura pública e PDF | existe |
| F-living | Checklist, testcase, gráficos e blocos interativos na leitura | existe |
| F-living-persist | Estado de checklist/testcase persiste no Markdown quando editável; replace de conteúdo (MCP/API) preserva marcações já salvas no rascunho (RN-54) | existe |

## Colaboração

| ID | Capacidade | Estado |
|---|---|---|
| F-compartilhar | Convidar por e-mail como leitor ou editor | existe |
| F-comentarios | Painel de revisão no editor, âncora opcional à seção `##` (RN-61) | existe |

## Templates e identidade

| ID | Capacidade | Estado |
|---|---|---|
| F-templates | Criar/editar/duplicar template particular; Default interno; tela própria | existe |
| F-logo | Logo do template e upload de imagens de relatório (Blob) | existe |
| F-anexo | Upload de anexos de qualquer tipo em relatórios (`:::file`) com card e badge de extensão | existe |
| F-auth | Login GitHub | existe |
| F-mcp-token | Gerar e revogar token pessoal MCP na tela Integrações; tokens ativos em tabela | existe |

## Agentes

| ID | Capacidade | Estado |
|---|---|---|
| F-mcp-docs | listar, ler, criar, duplicar, editar, publicar, desativar, excluir documentos | existe |
| F-mcp-templates | CRUD e preview de templates | existe |
| F-mcp-share | listar, convidar, revogar compartilhamentos | existe |
| F-mcp-catalogo | listar e explicar componentes Markdown | existe |
| F-mcp-guia | get_system_guide — guia completo gerado do catálogo e do produto, incluindo seção **Como evitar erros** (armadilhas de sintaxe) e avoidErrors por componente via explain_markdown_component | existe |
| F-mcp-upload | upload_image e upload_file — enviar imagens e anexos ao Blob (base64) e obter URL pública para `:::figure` / `:::file` | existe |
