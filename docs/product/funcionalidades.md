# Funcionalidades

O que o produto **faz** e o que **fará**. Estado: `existe` · `parcial` · `planejado`.

Planejados apontam o id do [backlog ICE](../../.cursor/skills/portulan-ice/backlog.md). Ao entregar, mude o estado aqui e lá.

## Workspace

| ID | Capacidade | Estado |
|---|---|---|
| F-navegacao | Trilho desktop com toggle compacto (ícones + tooltips) ou expandido (rótulos); Cartoteca e Gabaritos no menu Acervo; drawer no viewport estreito com o mesmo agrupamento | existe |
| F-porto-switcher | Seletor de porto no topo do trilho: porto ativo, trocar, criar novo e abrir a tela do porto | existe |
| F-dashboard | Ponte: resumo da cartoteca do porto ativo, cartas recentes, nova carta e atalhos para as outras telas | existe |

## Porto

| ID | Capacidade | Estado |
|---|---|---|
| F-porto | Criar portos, alternar o porto ativo e ganhar o porto inicial na primeira entrada (RN-86) | existe |
| F-porto-identidade | Renomear o porto (capitão e imediato) e escolher papel pessoal na tela `/porto` (RN-94) | existe |
| F-tripulacao | Listar a tripulação, mudar papéis, remover pessoas e transferir a capitania (RN-88) | existe |
| F-porto-convite | Convite por link com papel, validade e limite de usos; listar, revogar e resgatar em `/convite/{token}` (RN-89) | existe |
| F-porto-sair | Deixar o porto (com as travas de RN-90) e excluir um porto vazio (RN-91) | existe |

## Cartoteca

| ID | Capacidade | Estado |
|---|---|---|
| F-biblioteca | Listar cartas do porto ativo e as compartilhadas nominalmente, com busca local em título/resumo/tags/conteúdo, em tela própria | existe |
| F-filtro-template | Filtrar a lista por gabarito | existe |
| F-filtro-status | Filtrar por rascunho / revisão / publicado / arquivado; cards de resumo clicáveis | existe |
| F-filtro-origem | Filtrar e distinguir cartas minhas vs compartilhadas comigo; selo na linha | existe |
| F-busca-corpo | Buscar também no conteúdo (UI e MCP) | existe |
| F-stats | Contar cartas, publicadas, em revisão, rascunhos e arquivadas (na Ponte); cards levam à cartoteca filtrada | existe |

## Editor

| ID | Capacidade | Estado |
|---|---|---|
| F-editar | Título, resumo, Markdown, metadados, gabarito; prévia lado a lado | existe |
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
| F-publicar | Gerar release imutável e link `/d/{uuid}`; a carta permanece no nível de visibilidade atual (camarote por padrão) | existe |
| F-visibilidade | Três níveis escolhidos pelo cartógrafo: Camarote (privado), Porto (tripulação lê) e Mar aberto (link público). Padrão: Camarote. Controle no editor, em Compartilhar e nos metadados | existe |
| F-historico | Listar versões, copiar `/d` e `/p`, desativar versão, restaurar release no rascunho | existe |
| F-restaurar | Copiar uma release de volta para o rascunho | existe |
| F-diff-versoes | Comparar rascunho vs release ou duas releases (aba Histórico), com legenda, contagem e restauração no modal | existe |
| F-pdf-versao | Baixar PDF de uma versão publicada no Histórico (snapshot, não o rascunho) (RN-71) | existe |
| F-mover-porto | Mover a carta para outro porto em que o cartógrafo é tripulante (metadados do editor) | existe |
| F-slug-estavel | Slug UUID fixo na criação; título renomeável sem alterar `/d/{uuid}` | existe |
| F-desativar-doc | Desligar todos os links públicos sem excluir | existe |

## Leitura

| ID | Capacidade | Estado |
|---|---|---|
| F-publico | `/d/{uuid}` última versão; `/p/{id}` versão fixa. Visitante anônimo só entra em mar aberto | existe |
| F-tema | Escolher um dos cinco papéis claros ou cinco escuros, ou Personalizado com cor livre, no workspace, no acesso e na vista pública (RN-85) | existe |
| F-tema-porto | Papel por pessoa e por porto: escolha aplica na hora e grava neste navegador (trilho Tema, `/porto`, modal da conta) (RN-94) | existe |
| F-indice | TOC com âncoras em `##` / `###` na prévia do editor, prévia de rascunho, `/d`, `/p` e PDF | existe |
| F-mermaid | Renderizar fence ` ```mermaid ` com paleta do gabarito (flowchart, sequência, estado) na prévia, leitura pública e PDF | existe |
| F-living | Checklist, testcase, gráficos e blocos interativos na leitura | existe |
| F-living-persist | Estado de checklist/testcase persiste no Markdown quando editável; replace de conteúdo (MCP/API) preserva marcações já salvas no rascunho (RN-54) | existe |

## Colaboração

| ID | Capacidade | Estado |
|---|---|---|
| F-compartilhar | Convidar por e-mail como leitor ou editor | existe |
| F-externo | Marcar como **externo** o convidado que não é da tripulação do porto da carta (RN-93) | existe |
| F-comentarios | Comentar na prévia do editor (bloco ou trecho) e na aba Revisão; fios com resposta (RN-61, RN-65) | existe |
| F-resolver-comentarios | Resolver e reabrir fios; filtrar abertos, resolvidos ou todos na aba Revisão (RN-66) | existe |

## Gabaritos e identidade

| ID | Capacidade | Estado |
|---|---|---|
| F-templates | Criar/editar gabarito do porto ativo (toda a tripulação usa); Default interno; tela própria | existe |
| F-duplicar-template-ui | Duplicar gabarito na tela Gabaritos (paleta + conteúdo-base; mesmo contrato do MCP) | existe |
| F-mover-gabarito | Mover o gabarito para outro porto com capitania nos dois lados (RN-95); só pelo agente (`update_template`), sem caminho na tela Gabaritos | parcial |
| F-logo | Logo do gabarito e upload de imagens de relatório (Blob) | existe |
| F-anexo | Upload de anexos de qualquer tipo em relatórios (`:::file`) com card e badge de extensão | existe |
| F-auth | Entrar com GitHub ou com handle/e-mail e senha | existe |
| F-cadastro | Criar conta com handle, e-mail, nome e senha | existe |
| F-auth-mescla | Ligar GitHub e senha na mesma conta; desligar um método só se o outro existir | existe |
| F-conta | Clique na foto abre modal: dados, métodos, seletor de tema (RN-85), atalho Instrumentos e sair | existe |
| F-mcp-token | Gerar e revogar token pessoal MCP na tela Instrumentos (token preso ao porto ativo, RN-55) (rumos 01 endpoint → 02 token → 03 skill; cópia de endpoint/header/config; revogação com confirmação; catálogo completo de ferramentas agrupado) | existe |

## Agentes

| ID | Capacidade | Estado |
|---|---|---|
| F-mcp-docs | listar, ler, criar, duplicar, editar, publicar, desativar, excluir cartas; `visibility` e `workspace_id` em `update_document` | existe |
| F-mcp-comentarios | listar fios, criar raiz (âncora opcional), responder e remover o próprio comentário (RN-61, RN-65) | existe |
| F-mcp-restaurar | restaurar uma release no rascunho (`restore_document`) | existe |
| F-mcp-templates | CRUD e preview de gabaritos do porto do token; `workspace_id` em `update_template` move o gabarito de porto (RN-95) | existe |
| F-mcp-portos | `list_workspaces` — portos da pessoa e qual deles o token opera (RN-55); `create_workspace` — abrir porto novo como capitão (RN-86) | existe |
| F-mcp-share | listar, convidar, revogar compartilhamentos | existe |
| F-mcp-catalogo | listar e explicar componentes Markdown | existe |
| F-mcp-guia | get_system_guide — guia completo gerado do catálogo e do produto, incluindo seção **Como evitar erros** (armadilhas de sintaxe) e avoidErrors por componente via explain_markdown_component | existe |
| F-mcp-upload | upload_image e upload_file — enviar imagens e anexos ao Blob (base64) e obter URL pública para `:::figure` / `:::file` | existe |
