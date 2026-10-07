# Domínio

Vocabulário estável do Portulan. Se um termo mudar de significado, atualize este arquivo e as regras que o usam.

## O que é

Workspace editorial para criar, revisar, publicar e imprimir **cartas técnicas** (documentos) em Markdown, com a mesma cartoteca operável por pessoas (UI) e por agentes (MCP). O trabalho acontece dentro de um **porto**: um espaço com tripulação, cartas e gabaritos próprios.

## Léxico

A copy da UI usa o vocabulário náutico; o código, as URLs autenticadas e as APIs (MCP) mantêm os termos técnicos.

| UI | Código / API |
|---|---|
| Carta | documento (`document`) |
| Cartoteca | biblioteca (`/library`) |
| Gabarito | template (`/templates`) |
| Porto | workspace (`/workspace`) |
| Tripulação | membros do workspace |
| Cartógrafo | responsável / dono da carta (`userId`) |
| Frota | time (`team`, metadado da carta) |
| Ponte | dashboard (`/`) |
| Camarote · Porto · Mar aberto | `visibility` = `private` · `workspace` · `public` |
| Chave MCP | token (`mcpToken`), gerada na conta |
| Auditoria | evento de chamada MCP (`auditEvent`) |
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
| Agente MCP | Cliente autenticado com chave MCP. Opera como a pessoa, no porto da chave. Chave nova não tem identidade; chave legada pode ter. |
| Legado | Carta sem `userId` ou sem porto (pré-autenticação / pré-portos). Tratamento especial de acesso. |

## Entidades

### Porto (workspace)

Espaço de trabalho. Toda conta tem pelo menos um. Reúne tripulação, cartas, gabaritos e chaves MCP.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. |
| `slug` | Identificador legível derivado do nome, único. |
| `name` | Nome do porto (2–60). |
| `themePaper`, `themeMode`, `themeInk` | Partida visual do porto na primeira visita, antes de haver preferência pessoal salva (RN-94). |
| `isPersonal` | Verdadeiro no porto inicial da conta. Porto inicial não pode ser deixado nem excluído. |
| `createdBy` | Quem criou. |

### Tripulação (roster do porto)

Pessoas com conta e papel no porto, visíveis em `/workspace`.

| Tipo | Entidade | Papel |
|---|---|---|
| Humano | `workspaceMember` + conta | `owner` · `admin` · `member` |

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
| `draftVersion` | Versão otimista do **rascunho** para coedição (`baseVersion` das operações). Incrementa a cada operação colaborativa aplicada ou gravação legada de título, resumo ou conteúdo; publicação usa `version`, não altera releases já publicadas (RN-120). |
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

Identidade visual + Markdown inicial. Pertence ao porto onde foi criado: toda a tripulação usa. Alterar o gabarito **não** reescreve cartas já publicadas — só o Markdown inicial de novas cartas e o rascunho em edição.

| Campo | Papel |
|---|---|
| `draftVersion` | Versão otimista do conteúdo do gabarito para `content.operation` (RN-120). |

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

Credencial (`ptl_…`) gerada no modal da conta. Expira em 30d, 60d, 1 ano ou nunca. Autentica o agente como o usuário e fixa o porto ativo no momento da geração. Chave nova não cria identidade de agente (RN-111). Chave legada pode apontar para uma identidade ainda gravada; essa identidade restringe as ferramentas. O servidor nunca guarda a chave em texto puro.

### Componente Markdown

Bloco do catálogo (alerta, gráfico, checklist, …). A modal **Adicionar componente** e o MCP leem o mesmo catálogo. Novo bloco = uma entrada no catálogo, não uma lista paralela no editor.

### Identidade de agente MCP (`agentIdentity`)

Registro legado ligado a chaves antigas (`mcp_tokens.agent_identity_id`). A UI não gerencia identidades. Chave nova fica com `agent_identity_id` nulo. Se a identidade existir e estiver ativa, a chamada só passa nas ferramentas da lista gravada (RN-105, RN-111).

### Auditoria (`auditEvent`)

Evento imutável: pessoa, identidade de agente quando houver, chave, ação, alvo, data e correlação. Toda chamada MCP autenticada gera um evento (RN-122): ferramenta, alvo e resultado — nunca token em texto puro, anexo ou Markdown integral. Não há tela de consulta; o registro permanece no banco.

### Sala, presença e operação colaborativa

Infraestrutura do editor e do porto (RN-119). Uma **sala** é o recorte autorizado de uma carta, de um gabarito ou do próprio porto. **Presença** é quem está na sala agora — humano ou agente, com identidade e intenção visíveis. **Operação colaborativa** altera conteúdo mutável com versionamento e idempotência. **Comando atômico** (publicação, visibilidade, aprovação, lease, bloqueio, aceite) continua transação no servidor; não passa pelo canal de operações (RN-120). Postgres permanece a fonte de snapshots, releases, autorização e auditoria; o canal ao vivo não é fonte única de verdade (RN-124).

A sala projeta o direito que a UI e o MCP já aplicam: não concede nem amplia direito (RN-121). As entidades abaixo fecham cada termo.

### Assunto colaborativo (`collabRoom`: `subjectType` + `subjectId`)

O par **tipo + identificador** do artefato que uma sala representa. Um assunto, uma sala por porto — a unicidade é do banco, não da convenção.

| Assunto | Conteúdo mutável ao vivo | Comandos atômicos que o tocam |
|---|---|---|
| Carta (rascunho) | título, resumo, Markdown | publicar, desativar, mudar visibilidade, mover de porto, excluir |
| Gabarito | conteúdo-base | mover de porto, excluir |
| Porto (tripulação e convites) | — (sala `workspace`) | convidar, revogar, mudar papel, transferir capitania, excluir porto |
| Compartilhamento e cartas-fonte | — | convidar, revogar, mudar papel, vincular ou remover fonte |

Release publicada não é assunto colaborativo: é imutável. O caminho é nova publicação (RN-120).

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
| identidade | Conta humana e, se a chave tiver, a identidade de agente legada. |
| `intent` | Intenção declarada. |
| `state` | `ativo` · `ocioso` · `desconectado`. Deriva da última batida da sessão; desconectado sai da lista quando o prazo de graça expira. |
| `since` | Entrada na sala. |
| revogação | Instante em que a sessão foi encerrada por perda de acesso. Sessão revogada não conta como alguém na sala (RN-121). |
| foco | Bloco, campo ou coluna em que está, quando o artefato tem recorte. |

Presença carrega o mínimo: identidade, intenção, estado e foco. Não carrega conteúdo, token nem trecho de Markdown (RN-122).

### Intenção (`intention`)

O que aquela presença veio fazer. Torna leitura, edição e trabalho de agente distinguíveis antes de qualquer mudança.

| Intenção | Código | Significado |
|---|---|---|
| `lendo` | `viewing` | Acompanha; não pretende alterar. |
| `editando` | `editing` | Está aplicando operações no conteúdo mutável. |
| `revisando` | `reviewing` | Comentando ou resolvendo fios. |
| `executando` | `automating` | Presença automatizada de uma chave com identidade. |
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

### Operação colaborativa (`collabEvent` de tipo `content.operation`)

Mutação de conteúdo mutável. É o único caminho ao vivo para conteúdo (RN-120).

| Campo | Papel |
|---|---|
| `opId` | Chave de idempotência gerada pelo cliente. |
| `baseVersion` | Versão do rascunho (`draftVersion`) em que a operação foi calculada. |
| alvo | Assunto + campo (`content`, `title`, `summary` na carta; `content` no gabarito). |
| `payload` | Substituição do campo inteiro (`field` + `value`), não o artefato completo. |

### Idempotência

Propriedade obrigatória: reaplicar um `opId` já aplicado devolve o mesmo resultado e não gera evento novo. Vale para reconexão, retry de rede e reenvio de agente. Comando atômico segue a mesma exigência — publicar, aprovar, assumir ou aceitar duas vezes com a mesma chave é uma vez.

A chave é única **na sala**: repetir devolve o evento já gravado, sem segunda linha e sem nova posição; a mesma chave em outra sala é outro evento. Corrida por uma posição já ocupada vai para a seguinte, nunca sobrescreve.

### Comando atômico (`atomicCommand`)

Transação autorizada no servidor. Não passa pelo canal de operações; o canal só **anuncia** o resultado (RN-120).

Comandos: publicar, desativar carta ou versão, mudar visibilidade, mover de porto, excluir, convidar, revogar, mudar papel e transferir capitania.

### Atividade / linha do tempo (`activityEntry`)

Histórico legível do que aconteceu no assunto, em ordem.

| Campo | Papel |
|---|---|
| assunto | Artefato a que pertence. |
| autor | Pessoa e, quando houver, agente (“Nome via Agente”). |
| ação | Verbo do produto: editou, publicou, aprovou, assumiu, bloqueou, reportou, aceitou. |
| correlação | Liga a entrada ao evento do auditoria da mesma ação. |

Atividade é **por artefato** e segue a autorização daquele artefato. auditoria é **por porto** e existe para auditoria.

### Revogação

Perda de autorização sobre o assunto: sair ou ser removido da tripulação, chave revogada, identidade de agente desativada ou excluída, convite nominal revogado, visibilidade rebaixada, carta movida para outro porto, ferramenta MCP desabilitada.

Efeito: presença encerrada na hora, eventos e comandos protegidos daquela sala recusados, `policyVersion` avançada (RN-121). Revogação não apaga atividade nem Diário já gravados.

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{uuid}` | Sempre a última versão publicada **habilitada**. UUID fixo na criação. Em mar aberto, qualquer pessoa com o link vê; nos outros níveis, só cartógrafo, convidados e (em visibilidade de porto) a tripulação, autenticados. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. Mesma regra de acesso que `/d`. |
| `/documents/{id\|uuid}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |
| `/invite/{token}` | Resgate de convite de porto. Exige login. |

## Workspace autenticado

Chrome com trilho compacto ou expandido (RN-70). O seletor de porto aparece no trilho quando a pessoa tem mais de um porto. Destinos: Ponte, Cartoteca, Gabaritos e Porto. Não vale para leitura pública nem para o editor.

| URL | Significado |
|---|---|
| `/` | Ponte (dashboard): resumo da cartoteca, cartas recentes, atalhos. |
| `/library` | Cartoteca: lista do porto ativo, busca (título, resumo, tags e corpo), filtro por origem (minhas / compartilhadas), filtro por status e filtro por gabarito. |
| `/templates` | Gabaritos do porto ativo. |
| `/workspace` | Porto: identidade (nome e papel pessoal), tripulação, convites por link e zona de risco. |

## Componentes living

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Na leitura interativa o visitante pode marcar no **próprio navegador** (localStorage). Isso **não** altera o Markdown nem sincroniza entre aparelhos. Sem permissão de edição, a prévia declara que as marcações valem só naquele navegador.
