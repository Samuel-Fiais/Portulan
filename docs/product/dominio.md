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
| Manobra | tarefa de implementação raiz (`implementationTask`, `/context-packs/{id}/tasks/{taskId}`) |
| Lance | subtarefa da Manobra (`implementationTask` com `parentTaskId`) |
| Assumir o comando | lease da linha (`claimTask`) |
| Responsável | atribuição da Manobra ou Lance (`assigneeUserId` / `assigneeAgentIdentityId`) |
| Identificador de bordo | inteiro único no porto (`boardNumber`, `#42`) |
| Agente MCP | identidade nomeada (`agentIdentity`) |
| Chave de bordo | token MCP (`mcpToken`) |
| Diário de bordo | auditoria (`auditEvent`) |
| Assunto colaborativo | artefato que uma sala representa (`collabRoom`: `subjectType` + `subjectId`) |
| Sala | recorte autorizado ao vivo (`collabRoom`) |
| Presença | quem está na sala agora (`presenceSession`) |
| Intenção | o que a presença veio fazer (`intention`) |
| Evento versionado | evento ordenado da sala (`collabEvent`, com `seq`) |
| Operação colaborativa | mutação versionada de conteúdo mutável (`collabEvent` de tipo `content.operation`) |
| Comando atômico | transação autorizada no servidor (`atomicCommand`) |
| Idempotência | mesma chave aplicada uma vez só (`opId` do cliente, gravado como `idempotencyKey` da sala) |
| Revogação | perda de autorização sobre o assunto |
| Atividade (linha do tempo) | histórico legível do artefato (`activityEntry`) |
| Passagem de comando | handoff humano ↔ agente na mesma linha |
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
| Agente de bordo | Membro do porto do tipo `agente`: identidade nomeada (`agentIdentity`) com responsável humano, status e configuração MCP própria. Aparece na tripulação junto com humanos, mas **não** é conta nem membro com papel capitão/imediato/tripulante. Opera via MCP como o responsável, dentro do porto da chave. |
| Agente MCP | Cliente MCP autenticado com chave válida ligado a um Agente de bordo. Não tem Embarcação fixa. |
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

### Tripulação (roster do porto)

Lista unificada de quem compõe o porto: **humanos** (conta + papel) e **agentes de bordo** (identidade + responsável). Toda a tripulação vê os dois tipos em `/workspace`.

| Tipo | Entidade | Papel / configuração |
|---|---|---|
| Humano | `workspaceMember` + conta | `owner` · `admin` · `member` |
| Agente de bordo | `agentIdentity` | Responsável humano, status (`active`/`inactive`), ferramentas MCP permitidas (RN-111). Sem capitania nem convite. |

### Membro humano do porto

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
| `boardNumber` | Identificador público inteiro do porto (`#42`). UUID continua interno. |
| objetivo, resultado, escopo, não-escopo | Contrato operacional (objetivo opcional na criação). A tela **Contexto** junta contrato, Marcos, itens e cartas-fonte. |

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
| `boardNumber` | Identificador público inteiro do porto. |

### Carta-fonte (`documentSource`)

Relação entre Rumo, Manobra ou Lance e carta. No Rumo, fonte formal de aprovação aponta para **release imutável**. Em Manobra/Lance, cartas-fonte documentam referências de trabalho e a **Carta de conclusão** quando a linha é finalizada (RN-118). Publicar uma carta privada continua privado.

| Campo | Papel |
|---|---|
| carta + `releaseId` | Release específica. A UI distingue Carta viva e snapshot da edição fixada. |
| papel da fonte | Como a carta entra no Rumo ou na linha. |
| seção | Trecho opcional. |
| razão | Por que foi incluída. |
| obrigatória | No Rumo: exigida para aprovação formal. Em Manobra/Lance: raro; quando true, edição publicada é obrigatória. |
| `boardNumber` | Identificador público inteiro do porto. |
| âncora | Rumo (`contextPackSource`) ou Manobra/Lance (`implementationTaskSource`). |

### Marcos de chegada (`acceptanceCriterion`)

Critérios de aceite verificáveis do Rumo (e cobertos por Manobras). Pertencem ao **Contexto** da Feature, não à lista de trabalho. Têm `boardNumber`.

### Plano de navegação, Manobra e Lance

O plano é **opcional** e pertence a uma revisão do Rumo. Não é fonte de verdade paralela.

A **Manobra** é o PBI: objetivo, Embarcação e paths alvo (se for de código), itens obrigatórios, Marcos que cobre, dependências simples, a revisão exata do Rumo, responsável (humano ou agente) e `boardNumber`. Sem prazo, pontos ou sprint. O quadro Kanban é só vista dos estados: no quadro de Lances, a Manobra é a faixa à esquerda e os Lances cruzam as colunas.

O **Lance** é a mesma entidade com `parentTaskId` apontando para uma Manobra-raiz. Um nível só: Lance não tem filhos.

| Estado | Na UI | Significado |
|---|---|---|
| `available` | To do | Livre para assumir. |
| `claimed` | Doing | Com lease ativo. |
| `in_progress` | In progress | Em trabalho. |
| `blocked` | Blocked | Com Maré contrária. |
| `reported` | Done | Resultado enviado; ainda não aceito. |
| `accepted` | Accepted | Aceite humano. |

No Kanban, `claimed` e `in_progress` compartilham a coluna **In progress**.

Manobra **de código** tem `repositoryId`; sem isso é Manobra de contexto. Linha de comando = Manobra ou Lance. Uma Manobra com Lances também se assume.

### Responsável da Manobra ou Lance

Atribuição (`assigneeUserId` **ou** `assigneeAgentIdentityId`). Não é o lease. Delegar uma Manobra sem responsável preenche os Lances que também estão sem responsável (RN-115).

### Lease da Manobra

Um lease ativo por **linha** (Manobra ou Lance). Expira. Renovar exige atividade explícita. Expirado pode ser retomado. Manobra com Lances também se assume; o lease e o responsável de cada Lance são independentes do pai.

### Registro de bordo (`progressReport`)

Relatório de progresso ou resultado: resumo, arquivos/escopos, testes/evidências, commit/PR opcional, critérios cobertos e lacunas. Reportado não é automaticamente aceito. Resumo em branco não entra na lista (RN-108).

### Conversa de bordo

Fios de coordenação, separados dos comentários de revisão das cartas. Âncora: Rumo, Manobra, Lance, item ou Marco. Mensagem tem autor humano, identidade delegada opcional, horário, menções (`mentionedUserIds` / `mentionedAgentIdentityIds`) e aberto/resolvido. Comentário comum reutiliza o **fio de discussão** aberto do sujeito; Maré contrária é fio próprio (RN-109, RN-114). Corpo não vazio, até 2000 caracteres (RN-108). Fio e recado têm `boardNumber`. Conversa, mensagens e sujeito pertencem ao mesmo Porto.

### Identidade de agente MCP (`agentIdentity`)

Identidade nomeada criada junto com toda chave MCP nova. Responsável humano único (RN-110). Só o responsável edita, desativa, reativa ou exclui e emite chaves adicionais. Status: `active` ou `inactive` (`deactivatedAt` quando inativo). A Embarcação, o checkout e o `clientInfo` pertencem à **sessão**, não ao perfil. Paridade com o humano via MCP (RN-105), com lista `allowedMcpTools` — padrão catálogo completo; o responsável desmarca o que quiser restringir (RN-111). Manobra de código exige Embarcação reconhecida de verdade na sessão.

### Diário de bordo (`auditEvent`)

Evento imutável: principal humano, identidade do agente, chave, ação, alvo, data, correlação e `clientInfo` observado. A UI mostra “Nome via Agente”. Toda chamada MCP autenticada gera um evento pesquisável (RN-122): ferramenta, alvo, resultado, duração e correlação — nunca token em texto puro, anexo ou Markdown integral.

O Diário é **do porto** e serve auditoria: filtra por identidade, ferramenta, alvo, resultado, período e correlação. Guarda metadado e diagnóstico, não conteúdo. Tem janela de retenção declarada; expirar um evento não reescreve os que ficam.

### Sala, presença e operação colaborativa

Infraestrutura transversal do porto (RN-119). Uma **sala** é o recorte autorizado de um artefato (carta, gabarito, Rumo, plano, Expedição, Embarcação, Manobra, etc.) para participação ao vivo. **Presença** é quem está na sala agora — humano ou agente, com identidade e intenção visíveis. **Operação colaborativa** altera conteúdo mutável com versionamento e idempotência. **Comando atômico** (publicação, visibilidade, aprovação, lease, bloqueio, aceite) continua transação no servidor; não passa pelo canal de operações (RN-120). Postgres permanece a fonte de snapshots, releases, autorização e auditoria; o canal ao vivo não é fonte única de verdade (RN-124).

A sala projeta o direito que a UI e o MCP já aplicam: não concede nem amplia direito (RN-121). As entidades abaixo fecham cada termo.

### Assunto colaborativo (`collabRoom`: `subjectType` + `subjectId`)

O par **tipo + identificador** do artefato que uma sala representa. Um assunto, uma sala por porto — a unicidade é do banco, não da convenção.

| Assunto | Conteúdo mutável ao vivo | Comandos atômicos que o tocam |
|---|---|---|
| Carta (rascunho) | título, resumo, metadados, Markdown | publicar, desativar, mudar visibilidade, mover de porto, excluir |
| Gabarito | nome, paleta, logo, conteúdo-base | mover de porto, excluir |
| Rumo em rascunho ou revisão | contrato, itens, Marcos, vínculos de fonte | enviar para revisão, aprovar, abrir nova revisão |
| Plano de navegação | plano da revisão em rascunho | aprovar a revisão |
| Manobra e Lance | objetivo, descrição, estado editável, responsável | assumir, renovar, soltar, reportar, bloquear, aceitar |
| Expedição e Embarcação | nome, objetivo, notas, vínculos | excluir |
| Porto (tripulação e convites) | — | convidar, revogar, mudar papel, transferir capitania, excluir porto |
| Compartilhamento e cartas-fonte | — | convidar, revogar, mudar papel, vincular ou remover fonte |

Release publicada e revisão aprovada de Rumo **não** são assunto colaborativo: são imutáveis. O caminho é nova publicação ou nova revisão (RN-120).

### Sala (`collabRoom`)

Recorte autorizado do assunto para participação ao vivo. Não guarda conteúdo: é o canal.

| Campo | Papel |
|---|---|
| `workspaceId` | Porto da sala. Sala nunca cruza porto (RN-96). |
| assunto | Tipo + id do artefato. Único por porto: abrir a sala duas vezes devolve a mesma. |
| `seq` | Sequência monotônica dos eventos daquela sala. Base da ordem e da reconexão. |
| `policyVersion` | Carimbo da autorização vigente. Avança quando papel, convite, visibilidade ou porto do artefato muda. |
| participantes | Presenças ativas. |

Autorização da sala: porto e papel para os demais assuntos; na carta vale o acesso da própria carta — cartógrafo e editor convidado operam, visibilidade de porto e leitor entram em leitura (RN-17, RN-18, RN-121). Conteúdo imutável (release publicada, revisão aprovada) abre a sala em leitura, nunca em operação (RN-120).

Superfície sem sala continua funcionando por leitura normal: ausência de canal ao vivo degrada a experiência, não o trabalho.

### Presença (`presenceSession`)

Quem está no assunto **agora**. Uma presença por sessão, não por conta: a mesma pessoa em duas abas conta duas sessões e aparece uma vez por sessão.

| Campo | Papel |
|---|---|
| identidade | Conta humana **ou** identidade de agente de bordo (`agentIdentityId` + responsável), mais a chave usada. |
| `intent` | Intenção declarada. |
| `state` | `ativo` · `ocioso` · `desconectado`. Deriva da última batida da sessão; desconectado sai da lista quando o prazo de graça expira. |
| `since` | Entrada na sala. |
| revogação | Instante em que a sessão foi encerrada por perda de acesso. Sessão revogada não conta como alguém na sala (RN-121). |
| foco | Bloco, campo ou coluna em que está, quando o artefato tem recorte. |

Presença carrega o mínimo: identidade, intenção, estado e foco. Não carrega conteúdo, token nem trecho de Markdown (RN-122).

### Intenção (`presenceIntent`)

O que aquela presença veio fazer. Torna leitura, edição e trabalho de agente distinguíveis antes de qualquer mudança.

| Intenção | Código | Significado |
|---|---|---|
| `lendo` | `viewing` | Acompanha; não pretende alterar. |
| `editando` | `editing` | Está aplicando operações no conteúdo mutável. |
| `revisando` | `reviewing` | Comentando ou resolvendo fios. |
| `executando` | `automating` | Agente trabalhando numa linha com comando ativo (Manobra ou Lance). |
| `aguardando` | `waiting` | Espera passagem de comando, aceite humano ou desbloqueio. |

Intenção é declaração observada, nunca permissão. Agente **sempre** declara identidade e intenção (RN-123).

### Evento versionado (`collabEvent`)

Unidade que a sala transmite. Imutável, ordenada por `seq` dentro da sala.

| Campo | Papel |
|---|---|
| `seq` | Posição na sala, a partir de 1. Única na sala: dois eventos não ocupam a mesma posição. Quem reconecta pede o que veio depois do último `seq` visto. |
| `kind` | `operacao` · `comando` · `presenca` · `atividade`. |
| `type` | O evento em si: `content.operation`, `content.saved`, `command.applied`, `presence.joined`, `presence.updated`, `presence.left`, `room.closed`. |
| autor | Conta e, quando houver, identidade de agente, mais a chave usada. Pelo menos um dos dois. |
| `baseVersion` | Versão do conteúdo em que a operação foi calculada, quando houver. |
| `payload` | O mínimo para a superfície aplicar a mudança, já redigido (RN-122). |
| `idempotencyKey` | O `opId` do cliente. Única na sala. |
| `at` | Instante do servidor. |

O log é gravado em Postgres por sala; o canal transporta (RN-124). Evento é derivado: quem chegou depois, ou perdeu a janela, reconstrói do snapshot em Postgres e volta a seguir a sequência.

### Operação colaborativa (`collabOperation`)

Mutação de conteúdo mutável. É o único caminho ao vivo para conteúdo (RN-120).

| Campo | Papel |
|---|---|
| `opId` | Chave de idempotência gerada pelo cliente. |
| `baseVersion` | Versão do conteúdo em que a operação foi calculada. |
| alvo | Assunto + campo (ou faixa do Markdown). |
| `payload` | A mudança, não o documento inteiro. |

### Idempotência

Propriedade obrigatória: reaplicar um `opId` já aplicado devolve o mesmo resultado e não gera evento novo. Vale para reconexão, retry de rede e reenvio de agente. Comando atômico segue a mesma exigência — publicar, aprovar, assumir ou aceitar duas vezes com a mesma chave é uma vez.

A chave é única **na sala**: repetir devolve o evento já gravado, sem segunda linha e sem nova posição; a mesma chave em outra sala é outro evento. Corrida por uma posição já ocupada vai para a seguinte, nunca sobrescreve.

### Comando atômico (`atomicCommand`)

Transação autorizada no servidor. Não passa pelo canal de operações; o canal só **anuncia** o resultado (RN-120).

Comandos: publicar, desativar carta ou versão, mudar visibilidade, mover de porto, excluir, enviar Rumo para revisão, aprovar, abrir nova revisão, assumir / renovar / soltar o comando, abrir e resolver Maré contrária, registrar resultado, aceite humano, convidar, revogar, mudar papel e transferir capitania.

### Atividade / linha do tempo (`activityEntry`)

Histórico legível do que aconteceu no assunto, em ordem. É o que a vista **Atividade** do Rumo, o histórico da carta e o feed da Manobra mostram.

| Campo | Papel |
|---|---|
| assunto | Artefato a que pertence. |
| autor | Pessoa e, quando houver, agente (“Nome via Agente”). |
| ação | Verbo do produto: editou, publicou, aprovou, assumiu, bloqueou, reportou, aceitou. |
| correlação | Liga a entrada ao evento do Diário de bordo da mesma ação. |

Atividade é **por artefato** e segue a autorização daquele artefato. Diário de bordo é **por porto** e existe para auditoria.

### Revogação

Perda de autorização sobre o assunto: sair ou ser removido da tripulação, chave revogada, identidade de agente desativada ou excluída, convite nominal revogado, visibilidade rebaixada, carta movida para outro porto, ferramenta MCP desabilitada.

Efeito: presença encerrada na hora, eventos e comandos protegidos daquela sala recusados, `policyVersion` avançada (RN-121). Revogação não apaga atividade nem Diário já gravados.

### Passagem de comando (handoff)

Troca de responsabilidade sobre a mesma linha (Manobra ou Lance) entre pessoa e agente, ou entre agentes. Nada de novo em poder: responsável é atribuição (RN-115), comando é lease (RN-103), aceite é humano (RN-108). A colaboração ao vivo acrescenta a leitura — quem está na sala, com que intenção e quem detém o comando agora — e o registro da troca na atividade. Agente não assume aceite humano nem aprova por conta própria (RN-123).

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{uuid}` | Sempre a última versão publicada **habilitada**. UUID fixo na criação. Em mar aberto, qualquer pessoa com o link vê; nos outros níveis, só cartógrafo, convidados e (em visibilidade de porto) a tripulação, autenticados. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. Mesma regra de acesso que `/d`. |
| `/documents/{id\|uuid}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |
| `/invite/{token}` | Resgate de convite de porto. Exige login. |

No porto, Rumo, Manobra, Lance, item, carta-fonte, Marco, fio e recado compartilham uma sequência de inteiros (`boardNumber`). A UI mostra `#42` e copia `42`. UUID não aparece. MCP e UI resolvem o número no porto ativo.

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
| `/context-packs/{id}` | Detalhe de um Rumo (vistas Trabalho, Contexto e Atividade). |
| `/context-packs/{id}/tasks/{taskId}` | Detalhe de uma Manobra ou Lance. |
| `/repositories` | Embarcações do porto ativo: lista, detalhe e vínculo com Expedições. |
| `/repositories/{id}` | Detalhe de uma Embarcação. |
| `/integrations` | Instrumentos: rumos de conexão MCP, chaves MCP, catálogo de ferramentas e skill. |
| `/workspace` | Porto: identidade (nome e papel pessoal), tripulação, convites por link e zona de risco. |

## Componentes living

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Na leitura interativa o visitante pode marcar no **próprio navegador** (localStorage). Isso **não** altera o Markdown nem sincroniza entre aparelhos. Sem permissão de edição, a prévia declara que as marcações valem só naquele navegador.
