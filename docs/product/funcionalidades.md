# Funcionalidades

O que o produto **faz** e o que **fará**. Estado: `existe` · `parcial` · `planejado`.

Planejados apontam o id do [backlog ICE](../../.cursor/skills/portulan-ice/backlog.md). Ao entregar, mude o estado aqui e lá.

## Workspace

| ID | Capacidade | Estado |
|---|---|---|
| F-navegacao | Trilho desktop com toggle compacto (ícones + tooltips) ou expandido (rótulos); destinos irmãos nesta ordem: Ponte, Cartoteca, Gabaritos, Expedições, Embarcações, Rumos, Instrumentos e Porto; drawer no viewport estreito com a mesma lista (RN-70) | existe |
| F-porto-switcher | Seletor de porto no topo do trilho: porto ativo, trocar, criar novo e abrir a tela do porto | existe |
| F-dashboard | Ponte: resumo da cartoteca do porto ativo, cartas recentes, nova carta e atalhos para as outras telas | existe |

## Porto

| ID | Capacidade | Estado |
|---|---|---|
| F-porto | Criar portos, alternar o porto ativo e ganhar o porto inicial na primeira entrada (RN-86) | existe |
| F-porto-identidade | Renomear o porto (capitão e imediato) e escolher papel pessoal na tela `/workspace` (RN-94) | existe |
| F-tripulacao | Listar a tripulação (humanos + agentes de bordo como tipos distintos), mudar papéis humanos, remover pessoas e transferir a capitania (RN-88, RN-112) | existe |
| F-porto-convite | Convite por link com papel, validade e limite de usos; listar, revogar e resgatar em `/invite/{token}` (RN-89, RN-107) | existe |
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
| F-tema-porto | Papel por pessoa e por porto: escolha aplica na hora e grava neste navegador (trilho Tema, `/workspace`, modal da conta) (RN-94) | existe |
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
| F-presenca | Ver quem está no assunto agora — humano ou agente, com identidade, intenção (`lendo`, `editando`, `revisando`, `executando`, `aguardando`), estado e foco — na mesma leitura da superfície; revogar acesso encerra a presença na hora (RN-119, RN-121, RN-123) · ICE `realtime-transversal` · batida HTTP, faixa de presença na carta/Rumo/Manobra; revogação invalida sessão e `policyVersion` (Lances #65–#66) | parcial |
| F-coedicao | Dois participantes editam Carta, Gabarito, Rumo em rascunho/revisão, Plano ou Manobra sem sobrescrita silenciosa: operação com `opId` e `baseVersion`, recusa de base defasada e reaplicação idempotente; releases e revisões aprovadas continuam imutáveis, e publicar/aprovar/assumir/aceitar seguem comandos atômicos (RN-120, RN-124) · ICE `realtime-transversal` · log de eventos por sala (RN-125); **carta em rascunho/revisão e gabarito administrável** aplicam `content.operation` no Postgres com `draftVersion`, snapshot na sala e conflito 409 (Lances #67–#69); **Rumo em rascunho/revisão** coedita Recorte, itens, Marcos e **plano de navegação** (sala `implementation_plan`, subordinado ao Rumo aprovado) pelo mesmo padrão (Lances #70–#72); revisão aprovada recusa ops (RN-99); **editor de carta** envia ops de título/resumo/corpo pela sala ao vivo (sem OT fino) | parcial |
| F-atividade-viva | Superfícies do porto refletem ao vivo mudanças autorizadas de estado, participantes e atividade (Cartoteca, editor, Rumo, Kanban, Manobra, Lance, Expedição, Embarcação, tripulação, bloqueios e aceite), com linha do tempo por artefato correlacionada ao Diário; sem canal, a superfície volta à leitura normal (RN-119, RN-124) · ICE `realtime-transversal` · `command.applied` após comandos atômicos (tripulação, compartilhamentos, Manobra, bloqueio, aceite); sala `workspace` espelha feed do porto; timeline filtrável na Manobra (Lances #20, #29) | parcial |
| F-handoff | Passagem de comando entre pessoa e agente na mesma Manobra ou Lance: quem está na sala, com que intenção e quem detém o comando; a troca é soltar/assumir lease ou delegar responsável, registrada na atividade, sem atalho para o aceite humano (RN-115, RN-123) · ICE `realtime-transversal` · evento `handoff` na atividade ao atribuir responsável ou assumir/soltar via MCP (Lances #23) | parcial |

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
| F-mcp-token | Gerar e revogar chaves MCP na tela Instrumentos (passo 02: identidade nomeada + validade + ferramentas; preso ao porto ativo, RN-55, RN-111) (rumos 01 endpoint → 02 chaves → 03 skill; cópia de endpoint/header/config; revogação com confirmação; catálogo completo de ferramentas agrupado; Rumo/Manobra editáveis via MCP — itens, fontes, Marcos, plano, criar Manobra, revisão e aprovação — RN-105) | existe |

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

## Contexto de desenvolvimento

| ID | Capacidade | Estado |
|---|---|---|
| F-expedicao | Criar, listar e abrir Expedições do porto ativo, com objetivo, Embarcações vinculadas e Rumos; nome 2–80 (RN-108) | existe |
| F-embarcacao | Listar, abrir e registrar Embarcações (Git, local ou ambos) e vínculo N:N com Expedições, papel e paths relativos; nome 2–80 (RN-108) | existe |
| F-rumo | Criar Rumo e editar o **Contexto** unificado (contrato: resultado, escopo, fora de escopo e plano; Marcos; itens tipados; cartas-fonte) nas vistas Trabalho, Contexto e Atividade, enquanto estiver em rascunho ou revisão; título 3–180; item e Marco não vazios; identificador `#` (RN-108, RN-99, RN-116) | existe |
| F-rumo-aprovar | Enviar para revisão e aprovar, gerando revisão imutável; validade `needs_review` quando Carta-fonte ganha edição nova; ação explícita de nova revisão copia para rascunho (RN-99, RN-100) | existe |
| F-rumo-quadro | Lista aninhada de Manobras e Lances (Lances recolhidos por padrão; toggle ao lado do `#` da Manobra expande ou recolhe os filhos); Kanban com alternância **Manobras** (só raízes, cartão rico: responsável, progresso e checklist compacta de Lances com ação **+ Lance** em painel inseto) e **Lances** (faixa por Manobra-pai à esquerda do quadro, à esquerda da coluna To do: `#` e objetivo truncado; cartões de Lance nas colunas de estado da mesma faixa), colunas **To do**, **In progress**, **Blocked**, **Done** e **Accepted**, cartões visualmente distintos por tipo; estado legível só no cabeçalho da coluna — seletor de estado só na **Lista** e no detalhe; remoção só enquanto o Rumo está editável; delegação de responsável na Lista e no Kanban em qualquer Rumo com tripulação, exceto linha `accepted` (RN-113, RN-115, RN-117) | existe |
| F-carta-usada-em-contextos | Na carta, listar Rumos que a usam e iniciar um Rumo a partir dela | existe |
| F-manobra | Plano opcional; Manobras (PBI) e Lances (um nível) com lease atômico na linha — a Manobra se assume mesmo com Lances, sem tomar o comando dos filhos; relatório e aceite humano na Manobra; tela de issue com responsável, comando, estado editável, remoção, cartas-fonte vinculadas e voltar (RN-103, RN-108, RN-113, RN-117, RN-118) | existe |
| F-manobra-cartas-fonte | Vincular e remover cartas-fonte na Manobra ou Lance (UI e MCP); tripulação do porto; inclui Carta de conclusão ao finalizar (RN-118) | existe |
| F-delegar | Atribuir responsável (tripulante ou agente) a Manobra ou Lance, com cascata só se pai e filhos estão sem dono; não cria lease (RN-115) | existe |
| F-conversa-bordo | Feed único no Rumo, Manobra ou Lance: comentário reutiliza o fio de discussão, Maré é fio próprio (RN-109, RN-114); menção sem notificação; vários bloqueios só liberam na última resolução; corpo em branco não envia (RN-108) | existe |
| F-agente-bordo | Identidade nomeada do agente MCP — gestão de chaves, **editar permissões (ferramentas MCP)** a qualquer momento (RN-111), desativar/reativar/excluir (RN-110), Guia do Agente e Diário de bordo; unificado com F-mcp-token em Instrumentos; paridade humana via MCP (RN-105) | existe |
| F-mcp-dev-context | Ferramentas MCP de bootstrap, contexto, brief, Manobras, leases, relatórios e Conversas de bordo; chave sem participação no porto é recusada (RN-104) | existe |
| F-cli-init | CLI `portulan init` / `doctor` idempotente: reusa Embarcação e vincula a Expedição escolhida, sem gravar segredo (RN-106); roteiro ponta a ponta na skill portulan-mcp e no Guia do Agente | existe |
| F-diario-bordo | Auditoria imutável “Nome via Agente de Bordo”, com `clientInfo` observado persistido no token (RN-104) | existe |
| F-mcp-auditoria | Toda chamada MCP autenticada (leitura e escrita, sucesso ou recusa) vira evento pesquisável no Diário — busca por identidade, ferramenta, alvo, resultado, período e correlação, com duração, redaction e retenção declarada; sem token, segredo, anexo ou Markdown integral (RN-104, RN-122) · ICE `realtime-transversal` · invólucro central em `/api/mcp` + `queryAuditEvents` (Lance #26) | parcial |
