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
| F-filtro-origem | Filtrar e distinguir documentos meus vs compartilhados comigo; selo na linha | existe |
| F-busca-corpo | Buscar também no conteúdo (UI e MCP) | existe |
| F-stats | Contar documentos, publicados, em revisão, rascunhos e arquivados (no dashboard); cards levam à biblioteca filtrada | existe |

## Editor

| ID | Capacidade | Estado |
|---|---|---|
| F-editar | Título, resumo, Markdown, metadados, template; prévia lado a lado | existe |
| F-componentes | Inserir bloco do catálogo no cursor | existe |
| F-salvar | Persistir rascunho pelo botão Salvar ou Cmd/Ctrl+S; aviso ao sair com alterações não salvas (RN-62) | existe |
| F-atalhos-md | Cmd/Ctrl+B, I, K no textarea; Cmd/Ctrl+Shift+C abre a modal de componentes | existe |
| F-indent-tab | Tab / Shift+Tab indentam o Markdown sem sair do campo | existe |
| F-colar-imagem | Colar imagem da área de transferência insere `:::figure` | existe |
| F-prever | Abrir rascunho em outra aba | existe |
| F-pdf | Exportar PDF A4 do rascunho, com cabeçalho/rodapé e links clicáveis (RN-64) | existe |
| F-export-md | Baixar o Markdown fonte como `.md` no menu do editor | existe |
| F-duplicar | Clonar como rascunho novo (UI) | existe |
| F-duplicar-mcp | O mesmo via MCP (`duplicate_document`) | existe |

## Publicação

| ID | Capacidade | Estado |
|---|---|---|
| F-publicar | Gerar release imutável e link `/d/{uuid}`; o documento permanece privado até o responsável ligar o acesso público | existe |
| F-visibilidade | Ligar ou desligar acesso público (qualquer pessoa com o link). Padrão: privado. Cadeado ao lado de Publicar abre o acesso | existe |
| F-historico | Listar versões, copiar `/d` e `/p`, desativar versão, restaurar release no rascunho | existe |
| F-restaurar | Copiar uma release de volta para o rascunho | existe |
| F-diff-versoes | Comparar rascunho vs release ou duas releases (aba Histórico), com legenda, contagem e restauração no modal | existe |
| F-pdf-versao | Baixar PDF de uma versão publicada no Histórico (snapshot, não o rascunho) | planejado (pdf-release) |
| F-slug-estavel | Slug UUID fixo na criação; título renomeável sem alterar `/d/{uuid}` | existe |
| F-desativar-doc | Desligar todos os links públicos sem excluir | existe |

## Leitura

| ID | Capacidade | Estado |
|---|---|---|
| F-publico | `/d/{uuid}` última versão; `/p/{id}` versão fixa. Visitante anônimo só entra se o acesso público estiver ligado | existe |
| F-tema | Escolher um dos cinco papéis claros ou cinco escuros, ou Personalizado com cor livre, no workspace, no acesso e na vista pública (RN-85) | existe |
| F-indice | TOC com âncoras em `##` / `###` na prévia do editor, prévia de rascunho, `/d`, `/p` e PDF | existe |
| F-mermaid | Renderizar fence ` ```mermaid ` com paleta do template (flowchart, sequência, estado) na prévia, leitura pública e PDF | existe |
| F-living | Checklist, testcase, gráficos e blocos interativos na leitura | existe |
| F-living-persist | Estado de checklist/testcase persiste no Markdown quando editável; replace de conteúdo (MCP/API) preserva marcações já salvas no rascunho (RN-54) | existe |

## Colaboração

| ID | Capacidade | Estado |
|---|---|---|
| F-compartilhar | Convidar por e-mail como leitor ou editor | existe |
| F-comentarios | Comentar na prévia do editor (bloco ou trecho) e na aba Revisão; fios com resposta (RN-61, RN-65) | existe |
| F-resolver-comentarios | Resolver e reabrir fios; filtrar abertos, resolvidos ou todos na aba Revisão (RN-66) | existe |

## Templates e identidade

| ID | Capacidade | Estado |
|---|---|---|
| F-templates | Criar/editar template particular; Default interno; tela própria | existe |
| F-duplicar-template-ui | Duplicar template na tela Templates (particular, paleta + conteúdo-base; mesmo contrato do MCP) | existe |
| F-logo | Logo do template e upload de imagens de relatório (Blob) | existe |
| F-anexo | Upload de anexos de qualquer tipo em relatórios (`:::file`) com card e badge de extensão | existe |
| F-auth | Entrar com GitHub ou com handle/e-mail e senha | existe |
| F-cadastro | Criar conta com handle, e-mail, nome e senha | existe |
| F-auth-mescla | Ligar GitHub e senha na mesma conta; desligar um método só se o outro existir | existe |
| F-conta | Clique na foto abre modal: dados, métodos, seletor de tema (RN-85), atalho Integrações e sair | existe |
| F-mcp-token | Gerar e revogar token pessoal MCP na tela Integrações (rumos 01 endpoint → 02 token → 03 skill; cópia de endpoint/header/config; revogação com confirmação; catálogo completo de ferramentas agrupado) | existe |

## Agentes

| ID | Capacidade | Estado |
|---|---|---|
| F-mcp-docs | listar, ler, criar, duplicar, editar, publicar, desativar, excluir documentos | existe |
| F-mcp-comentarios | listar fios, criar raiz (âncora opcional), responder e remover o próprio comentário (RN-61, RN-65) | existe |
| F-mcp-restaurar | restaurar uma release no rascunho (`restore_document`) | existe |
| F-mcp-templates | CRUD e preview de templates | existe |
| F-mcp-share | listar, convidar, revogar compartilhamentos | existe |
| F-mcp-catalogo | listar e explicar componentes Markdown | existe |
| F-mcp-guia | get_system_guide — guia completo gerado do catálogo e do produto, incluindo seção **Como evitar erros** (armadilhas de sintaxe) e avoidErrors por componente via explain_markdown_component | existe |
| F-mcp-upload | upload_image e upload_file — enviar imagens e anexos ao Blob (base64) e obter URL pública para `:::figure` / `:::file` | existe |
