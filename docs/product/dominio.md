# Domínio

Vocabulário estável do Portulan. Se um termo mudar de significado, atualize este arquivo e as regras que o usam.

## O que é

Workspace editorial para criar, revisar, publicar e imprimir **cartas técnicas** (documentos) em Markdown, com a mesma cartoteca operável por pessoas (UI) e por agentes (MCP). O trabalho acontece dentro de um **porto**: um espaço com tripulação e acervo próprios. Dentro do porto, uma **Expedição** reúne o conhecimento de desenvolvimento (Embarcações, Rumos e Manobras) sem substituir o porto.

## Léxico

A copy da UI usa o vocabulário náutico; o código, as URLs autenticadas e as APIs (MCP) mantêm os termos técnicos.

| UI | Código / API |
|---|---|
| Carta | documento (`document`) |
| Cartoteca | biblioteca (`/library`) |
| Gabarito | template (`/templates`) |
| Instrumentos | integrações (`/integrations`) |
| Porto | workspace (`/workspace`) |
| Tripulação | membros do workspace |
| Cartógrafo | responsável / dono da carta (`userId`) |
| Frota | time (`team`, metadado da carta) |
| Ponte | dashboard (`/`) |
| Camarote · Porto · Mar aberto | `visibility` = `private` · `workspace` · `public` |
| Expedição | projeto (`project`, `/projects`) |
| Embarcação | repositório lógico (`repository`, `/repositories`) |
| Rumo | Context Pack (`contextPack`, `/context-packs`)
| Rumo de execução | projeção (`devContext`) |
| Plano de navegação | plano (`implementationPlan`) |
| Manobra | tarefa de implementação (`implementationTask`, `/context-packs/{id}/tasks/{taskId}`) |
| Assumir o comando | lease da Manobra (`claimTask`) |
| Agente MCP | identidade nomeada (`agentIdentity`) |
| Chave de bordo | token MCP (`mcpToken`) |
| Diário de bordo | auditoria (`auditEvent`) |
| Conversa de bordo | fio de coordenação (`coordinationThread`) |
| Registro de bordo | relatório de progresso (`progressReport`) |
| Marcos de chegada | critério de aceite (`acceptanceCriterion`) |
| Carta-fonte | fonte documental (`documentSource`) |
| Maré contrária | bloqueio (`blocker`) |

## Atores

| Ator | Quem é |
|---|---|
| Capitão | Dono do porto (`owner`). Comanda nome, tripulação, capitania e exclusão do porto. |
| Imediato | `admin` do porto. Cuida da tripulação (convida, remove, muda papéis) e do nome do porto. Não transfere capitania nem exclui o porto. |
| Tripulante | `member` do porto. Cria as próprias cartas e lê as que o porto abriu. Não gerencia pessoas. |
| Cartógrafo | Dono da carta (`userId`). Único que compartilha, muda visibilidade, move de porto, desativa a carta inteira, duplica e exclui. |
| Editor | Convidado com papel `editor` naquela carta. Edita rascunho e pode publicar. |
| Leitor | Convidado com papel `viewer` naquela carta. Lê rascunho e prévia; não edita. |
| Externo | Convidado nominal que **não** faz parte do porto da carta. Mesmo papel de editor/leitor, marcado como externo na UI. |
| Visitante público | Quem abre `/d/{slug}` ou `/p/{id}` sem login. Só vê versão publicada e habilitada de carta em mar aberto. |
| Agente MCP | Cliente MCP autenticado com chave válida. Toda chave nova cria uma identidade nomeada (ex.: Claude Code) ligada a um responsável humano. Opera como aquele usuário, dentro do porto da chave. Não tem Embarcação fixa. |
| Legado | Carta sem `userId` ou sem porto (pré-autenticação / pré-portos). Tratamento especial de acesso. |

## Entidades

### Porto (workspace)

Espaço de trabalho. Toda conta tem pelo menos um. Reúne tripulação, cartas, gabaritos, Expedições, Embarcações, Rumos, agentes MCP e chaves MCP.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. |
| `slug` | Identificador legível derivado do nome, único. |
| `name` | Nome do porto (2–60). |
| `themePaper`, `themeMode`, `themeInk` | Partida visual do porto na primeira visita, antes de haver preferência pessoal salva (RN-94). |
| `isPersonal` | Verdadeiro no porto inicial da conta. Porto inicial não pode ser deixado nem excluído. |
| `createdBy` | Quem criou. |

### Tripulação (membro do porto)

Vínculo entre uma conta e um porto, com um papel.

| Papel | Pode |
|---|---|
| `owner` (Capitão) | Tudo do porto: nome, tripulação, transferir capitania, excluir o porto. Um por porto. |
| `admin` (Imediato) | Convidar, remover, mudar papéis de tripulantes; mudar nome do porto. |
| `member` (Tripulante) | Criar as próprias cartas e ler as abertas ao porto. Só lê a tripulação. |

### Convite de porto

Link de entrada (`/invite/{token}`), não convite por e-mail. Token exibido uma única vez, guardado com hash.

| Campo | Papel |
|---|---|
| `role` | `admin` ou `member`. Capitania não se convida, se transfere. |
| `expiresAt` | 1 dia, 7 dias, 30 dias ou nunca. |
| `maxUses` | Limite de usos (1–500) ou sem limite. |
| `uses` | Quantas vezes já foi resgatado. |
| `revokedAt` | Revogação manual. Convite revogado nunca volta. |

### Carta (documento)

Rascunho vivo. Não é o que o público vê.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. Exclusão exige este id. |
| `slug` | UUID fixo na URL estável `/d/{uuid}`. Definido na criação; **não** muda ao renomear o título (RN-08). Slugs legados (título) redirecionam via alias. |
| `title`, `summary` | Título (3–180) e resumo (até 500). |
| `status` | `draft` · `review` · `published` · `archived`. Rótulo editorial; não dispara fluxo sozinho. |
| `templateId` | Gabarito: paleta, logo e conteúdo-base. |
| `workspaceId` | Porto a que a carta pertence. Definido na criação a partir do porto ativo. O cartógrafo pode mover a carta para outro porto em que também seja tripulante. Nulo = carta legada, sem porto. |
| `visibility` | `private` (Camarote) · `workspace` (Porto) · `public` (Mar aberto). Nasce `private` (RN-16). |
| `author` (Cartógrafo), `team` (Frota), `tags` | Metadados (até 12 tags, 1–40 chars). São texto livre do relatório, independentes de quem é o cartógrafo dono e de quem é a tripulação. |
| `content` | Markdown + diretivas `:::nome` (até 250.000 chars). |
| `version` | Número da última versão **publicada**. Salvar rascunho não incrementa. |
| `disabled` | Se verdadeiro, nenhum link `/d` ou `/p` desta carta mostra conteúdo. |

### Visibilidade da carta

Três níveis, escolhidos só pelo cartógrafo (RN-18). Convite nominal por e-mail continua valendo em qualquer nível.

| Nível | UI | Quem lê |
|---|---|---|
| `private` | Camarote | Só o cartógrafo e quem foi convidado nominalmente. |
| `workspace` | Porto | Toda a tripulação do porto da carta, sem poder editar; mais cartógrafo e convidados. |
| `public` | Mar aberto | Qualquer pessoa com `/d` ou `/p` vê a versão publicada habilitada. |

### Versão publicada (release)

Snapshot **imutável** criado ao publicar. O rascunho pode mudar depois; a release não.

| Campo | Papel |
|---|---|
| `id` | UUID da versão fixa. URL `/p/{id}`. |
| `version` | Inteiro, único por carta. |
| conteúdo + paleta | Cópia do rascunho no instante da publicação. |
| `disabled` | Desliga só este `/p/{id}`. Outras versões e o `/d/{slug}` (se houver versão ativa) continuam. |
| `publishedBy` | Quem publicou. |

### Gabarito (template)

Identidade visual + Markdown inicial. Pertence ao porto onde foi criado: toda a tripulação usa.

| Tipo | Quem usa | Quem altera | Pode excluir |
|---|---|---|---|
| Interno (`Default`) | Todo mundo | Ajustes de nome/cores/conteúdo | Não |
| Do porto | Tripulação do porto | Autor, capitão ou imediato do porto | Sim |
| Particular legado (sem porto) | Só o dono | Só o dono | Sim |

### Compartilhamento (convite nominal da carta)

Convite por e-mail, papel `viewer` ou `editor`. Um e-mail por carta. Independe do porto: quem não é da tripulação entra como **externo**.

### Comentário de revisão

Feedback textual no editor, visível a todos com acesso à carta. Não aparece em leitura pública. Um **fio** é um comentário-raiz e as respostas a ele.

| Campo | Papel |
|---|---|
| `body` | Texto do comentário (até 2.000 caracteres). |
| `quotedText` | Trecho citado da prévia (até 280 caracteres). Só no comentário-raiz. |
| `blockAnchor` | Opcional. Identificador do bloco na prévia no momento do comentário (capa, título `##`/`###`, parágrafo ou componente). Só no comentário-raiz. Sem âncora = carta inteira. |
| `parentId` | Comentário-raiz do fio. Nulo = raiz. Resposta não aninha em outra resposta. |
| `resolvedAt` | Marca de resolução do fio. Só no comentário-raiz; nulo = aberto. |
| `userId` | Autor autenticado. |

### Conta

Identidade de quem entra no Portulan. Uma pessoa, um `id` estável.

| Campo | Papel |
|---|---|
| `id` | UUID interno. Dono de cartas, tokens e convites, e tripulante de um ou mais portos. |
| Handle | Nome de usuário único (sem maiúsculas na comparação). Serve para entrar com senha. |
| E-mail | Único quando informado. Serve para entrar com senha, convites e mescla com GitHub. |
| Nome | Nome de exibição. |
| Foto | URL do GitHub, se ligado; senão, iniciais do nome ou handle. |
| Métodos | `github` e/ou `senha`. Pelo menos um. |

Não há verificação de e-mail nem recuperação por mensagem. Quem esqueceu a senha só recupera se a conta já tiver GitHub (RN-84).

### Tema

Preferência visual **por pessoa** (RN-94): escolher um swatch pinta na hora e grava neste navegador — por porto quando há porto ativo. Capitão e imediato não impõem papel para a tripulação.

| Papel | Tinta de ação | Acento |
|---|---|---|
| Carta | Chart Ink (navy) | Seal Wax |
| Pergaminho | Umber | Ferrugem |
| Névoa | Grafite | Chart Indigo |
| Costa | Sounding Teal Ink | Chart Ink |
| Lacre | Seal Wax | Chart Ink |

Cada papel tem modo claro e escuro. **Personalizado** é a sexta opção: a pessoa escolhe qualquer cor no seletor; essa tinta vira a ação do chrome naquele modo. A marca de três barras permanece Carta.

### Chave MCP

Credencial (`ptl_…`) ligada a uma identidade nomeada no porto. Expira em 30d, 60d, 1 ano ou nunca. Autentica o agente como o usuário **e** fixa o porto em que ele opera: o porto ativo no momento da geração. Cartas criadas pelo agente nascem nesse porto. Na criação, o responsável escolhe validade e quais ferramentas MCP ficam habilitadas (RN-111). Chaves legadas sem identidade continuam válidas até revogação. O servidor nunca guarda a chave em texto puro; afirma só qual credencial foi usada. `clientInfo` do handshake MCP é dado observado, não autenticação.

### Componente Markdown

Bloco do catálogo (alerta, gráfico, checklist, …). A modal **Adicionar componente** e o MCP leem o mesmo catálogo. Novo bloco = uma entrada no catálogo, não uma lista paralela no editor.

### Expedição (project)

Iniciativa ou produto **dentro de um porto**. Agrupa Embarcações e Rumos. Não substitui o porto: acervo, tripulação, permissões e tokens continuam no porto.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. |
| `workspaceId` | Porto a que pertence. |
| `name` | Nome da Expedição (2–80). |
| `objective` | O que esta Expedição cobre. |
| `createdBy` | Quem criou. |

### Embarcação (repository)

Identidade **lógica** de código no porto. Pode ser Git, local ou ambos. Um path de checkout é da máquina do cliente, nunca verdade global do servidor.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. |
| `workspaceId` | Porto a que pertence. |
| `name` | Nome da Embarcação (2–80). |
| `kind` | `git` · `local` · `both`. |
| `remoteUrl` | URL remota opcional. Não é path absoluto. |
| `notes` | Observações. |

### Vínculo Expedição–Embarcação (`ProjectRepository`)

Relação N:N. Uma Expedição tem várias Embarcações; uma Embarcação participa de várias Expedições.

| Campo | Papel |
|---|---|
| `role` | `primary` · `dependency` · `consumer` · `infrastructure`. |
| `pathScopes` | Paths relativos cobertos pelo vínculo. |
| `notes` | Observações do vínculo. |

### Rumo (contextPack)

Objeto persistente, curado, revisado e versionado. Uma carta pode ser fonte de zero, um ou vários Rumos; um Rumo pode usar várias cartas e também itens escritos nele.

| Campo | Papel |
|---|---|
| `status` | Ciclo: `draft` · `review` · `approved` · `superseded`. |
| `validity` | Independente do ciclo: `current` · `needs_review` · `expired`. |
| `ownerUserId` | Responsável humano do Rumo. |
| `projectId` | Expedição a que pertence. |
| título | 3–180. |
| objetivo, resultado, escopo, não-escopo | Contrato operacional (objetivo opcional na criação). |

### Revisão do Rumo (`contextPackRevision`)

Snapshot **imutável** criado ao aprovar. A revisão anterior permanece auditável. MCP serve por padrão só uma revisão `approved` e validade `current`.

### Rumo de execução (`devContext`)

Projeção consumida na hora de implementar — **não** é entidade persistida. Junta o objetivo da Expedição + revisão aprovada do Rumo + recorte de Embarcação/Manobra + dados observados da sessão.

### Item de contexto

Bloco tipado do Rumo.

| Campo | Papel |
|---|---|
| `type` | `decision` · `rule` · `contract` · `risk` · `assumption` · `question`. |
| `strength` | `required` · `recommended` · `reference`. |
| `blocking` | Em pergunta: se aberta, impede servir o Rumo. |
| `body` | Texto do item; não vazio (RN-108). |

### Carta-fonte (`documentSource`)

Relação entre Rumo e carta. Fonte formal de aprovação aponta para **release imutável**. Publicar uma carta privada continua privado.

| Campo | Papel |
|---|---|
| carta + `releaseId` | Release específica. A UI distingue Carta viva e snapshot da edição fixada. |
| papel da fonte | Como a carta entra no Rumo. |
| seção | Trecho opcional. |
| razão | Por que foi incluída. |
| obrigatória | Se a fonte é exigida para aprovação — neste caso a edição publicada é obrigatória. |

### Marcos de chegada (`acceptanceCriterion`)

Critérios de aceite verificáveis do Rumo (e cobertos por Manobras).

### Plano de navegação e Manobra

O plano é **opcional** e pertence a uma revisão do Rumo. Não é fonte de verdade paralela.

Cada Manobra tem objetivo, Embarcação e paths alvo (se for de código), itens obrigatórios que a governam, Marcos que cobre, dependências simples e a revisão exata do Rumo. Sem responsável humano, prazo, pontos, sprint ou quadro.

| Estado | Significado |
|---|---|
| `available` | Livre para assumir. |
| `claimed` | Com lease ativo. |
| `in_progress` | Em trabalho. |
| `blocked` | Com Maré contrária. |
| `reported` | Resultado enviado; ainda não aceito. |
| `accepted` | Aceite humano. |

Manobra **de código** tem `repositoryId`; sem isso é Manobra de contexto.

### Lease da Manobra

Um lease ativo por Manobra. Expira. Renovar exige atividade explícita. Expirado pode ser retomado.

### Registro de bordo (`progressReport`)

Relatório de progresso ou resultado: resumo, arquivos/escopos, testes/evidências, commit/PR opcional, critérios cobertos e lacunas. Reportado não é automaticamente aceito. Resumo em branco não entra na lista (RN-108).

### Conversa de bordo

Fios de coordenação, separados dos comentários de revisão das cartas. Âncora: Rumo, Manobra, item ou Marco. Mensagem tem autor humano, identidade delegada opcional, horário e aberto/resolvido. O tipo do fio — Conversa ou Maré contrária — é escolhido ao abrir (RN-109). Corpo não vazio, até 2000 caracteres (RN-108). Conversa, mensagens e sujeito pertencem ao mesmo Porto.

### Identidade de agente MCP (`agentIdentity`)

Identidade nomeada criada junto com toda chave MCP nova. Responsável humano único (RN-110). Só o responsável edita, desativa, reativa ou exclui e emite chaves adicionais. Status: `active` ou `inactive` (`deactivatedAt` quando inativo). A Embarcação, o checkout e o `clientInfo` pertencem à **sessão**, não ao perfil. Paridade com o humano via MCP (RN-105), com lista `allowedMcpTools` — padrão catálogo completo; o responsável desmarca o que quiser restringir (RN-111). Manobra de código exige Embarcação reconhecida de verdade na sessão.

### Diário de bordo (`auditEvent`)

Evento imutável: principal humano, identidade do agente, chave, ação, alvo, data, correlação e `clientInfo` observado. A UI mostra “Nome via Agente”.

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{uuid}` | Sempre a última versão publicada **habilitada**. UUID fixo na criação. Em mar aberto, qualquer pessoa com o link vê; nos outros níveis, só cartógrafo, convidados e (em visibilidade de porto) a tripulação, autenticados. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. Mesma regra de acesso que `/d`. |
| `/documents/{id\|uuid}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |
| `/invite/{token}` | Resgate de convite de porto. Exige login. |

## Workspace autenticado

Chrome com trilho compacto ou expandido (RN-70) e, no topo, o seletor de porto. Destinos irmãos no trilho, nesta ordem: Ponte, Cartoteca, Gabaritos, Expedições, Embarcações, Rumos, Instrumentos e Porto. Não vale para leitura pública nem para o editor.

| URL | Significado |
|---|---|
| `/` | Ponte (dashboard): resumo da cartoteca, cartas recentes, atalhos. |
| `/library` | Cartoteca: lista do porto ativo, busca (título, resumo, tags e corpo), filtro por origem (minhas / compartilhadas), filtro por status e filtro por gabarito. |
| `/templates` | Gabaritos do porto ativo. |
| `/projects` | Expedições do porto ativo: lista, detalhe, Embarcações vinculadas e Rumos. |
| `/projects/{id}` | Detalhe de uma Expedição. |
| `/context-packs` | Rumos do porto ativo. |
| `/context-packs/{id}` | Detalhe de um Rumo. |
| `/context-packs/{id}/tasks/{taskId}` | Detalhe de uma Manobra. |
| `/repositories` | Embarcações do porto ativo: lista, detalhe e vínculo com Expedições. |
| `/repositories/{id}` | Detalhe de uma Embarcação. |
| `/integrations` | Instrumentos: rumos de conexão MCP, chaves MCP, catálogo de ferramentas e skill. |
| `/workspace` | Porto: identidade (nome e papel pessoal), tripulação, convites por link e zona de risco. |

## Componentes living

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Na leitura interativa o visitante pode marcar no **próprio navegador** (localStorage). Isso **não** altera o Markdown nem sincroniza entre aparelhos. Sem permissão de edição, a prévia declara que as marcações valem só naquele navegador.
