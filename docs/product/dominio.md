# Domínio

Vocabulário estável do Portulan. Se um termo mudar de significado, atualize este arquivo e as regras que o usam.

## O que é

Workspace editorial para criar, revisar, publicar e imprimir **cartas técnicas** (documentos) em Markdown, com a mesma cartoteca operável por pessoas (UI) e por agentes (MCP). O trabalho acontece dentro de um **porto**: um espaço com tripulação, tema e acervo próprios.

## Léxico

A copy da UI usa o vocabulário náutico; o código e as APIs (MCP, rotas JSON) mantêm os termos técnicos.

| UI | Código / API |
|---|---|
| Carta | documento (`document`) |
| Cartoteca | biblioteca (`/biblioteca`) |
| Gabarito | template |
| Instrumentos | integrações (`/integrations`) |
| Porto | workspace |
| Tripulação | membros do workspace |
| Cartógrafo | responsável / dono da carta (`userId`) |
| Frota | time (`team`, metadado da carta) |
| Ponte | dashboard (`/`) |
| Camarote · Porto · Mar aberto | `visibility` = `private` · `workspace` · `public` |

## Atores

| Ator | Quem é |
|---|---|
| Capitão | Dono do porto (`owner`). Comanda nome, tema, tripulação, capitania e exclusão do porto. |
| Imediato | `admin` do porto. Cuida da tripulação (convida, remove, muda papéis) e da identidade (nome, tema). Não transfere capitania nem exclui o porto. |
| Tripulante | `member` do porto. Cria as próprias cartas e lê as que o porto abriu. Não gerencia pessoas. |
| Cartógrafo | Dono da carta (`userId`). Único que compartilha, muda visibilidade, move de porto, desativa a carta inteira, duplica e exclui. |
| Editor | Convidado com papel `editor` naquela carta. Edita rascunho e pode publicar. |
| Leitor | Convidado com papel `viewer` naquela carta. Lê rascunho e prévia; não edita. |
| Externo | Convidado nominal que **não** faz parte do porto da carta. Mesmo papel de editor/leitor, marcado como externo na UI. |
| Visitante público | Quem abre `/d/{slug}` ou `/p/{id}` sem login. Só vê versão publicada e habilitada de carta em mar aberto. |
| Agente | Cliente MCP autenticado com token pessoal. Opera como aquele usuário, dentro do porto do token. |
| Legado | Carta sem `userId` ou sem porto (pré-autenticação / pré-portos). Tratamento especial de acesso. |

## Entidades

### Porto (workspace)

Espaço de trabalho. Toda conta tem pelo menos um. Reúne tripulação, cartas, gabaritos e tokens MCP.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. |
| `slug` | Identificador legível derivado do nome, único. |
| `name` | Nome do porto (2–60). |
| `themePaper`, `themeMode`, `themeInk` | Tema do porto: papel, modo claro/escuro e tinta de ação. Vale para toda a tripulação e para qualquer aparelho (RN-86). |
| `isPersonal` | Verdadeiro no porto inicial da conta. Porto inicial não pode ser deixado nem excluído. |
| `createdBy` | Quem criou. |

### Tripulação (membro do porto)

Vínculo entre uma conta e um porto, com um papel.

| Papel | Pode |
|---|---|
| `owner` (Capitão) | Tudo do porto: nome, tema, tripulação, transferir capitania, excluir o porto. Um por porto. |
| `admin` (Imediato) | Convidar, remover, mudar papéis de tripulantes; mudar nome e tema. |
| `member` (Tripulante) | Criar as próprias cartas e ler as abertas ao porto. Só lê a tripulação. |

### Convite de porto

Link de entrada (`/convite/{token}`), não convite por e-mail. Token exibido uma única vez, guardado com hash.

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

Preferência visual do **porto** (RN-86): viaja com a conta e vale em qualquer aparelho. Cada pessoa pode manter um papel próprio naquele navegador (sobrescrita local, por porto); capitão e imediato definem o papel padrão do porto.

| Papel | Tinta de ação | Acento |
|---|---|---|
| Carta | Chart Ink (navy) | Seal Wax |
| Pergaminho | Umber | Ferrugem |
| Névoa | Grafite | Chart Indigo |
| Costa | Sounding Teal Ink | Chart Ink |
| Lacre | Seal Wax | Chart Ink |

Cada papel tem modo claro e escuro. **Personalizado** é a sexta opção: a pessoa escolhe qualquer cor no seletor; essa tinta vira a ação do chrome naquele modo. A marca de três barras permanece Carta.

### Token MCP

Credencial pessoal (`ptl_…`). Expira em 30d, 60d, 1 ano ou nunca. Autentica o agente como o usuário **e** fixa o porto em que ele opera: o porto ativo no momento da geração. Cartas criadas pelo agente nascem nesse porto.

### Componente Markdown

Bloco do catálogo (alerta, gráfico, checklist, …). A modal **Adicionar componente** e o MCP leem o mesmo catálogo. Novo bloco = uma entrada no catálogo, não uma lista paralela no editor.

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{uuid}` | Sempre a última versão publicada **habilitada**. UUID fixo na criação. Em mar aberto, qualquer pessoa com o link vê; nos outros níveis, só cartógrafo, convidados e (em visibilidade de porto) a tripulação, autenticados. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. Mesma regra de acesso que `/d`. |
| `/documents/{id\|uuid}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |
| `/convite/{token}` | Resgate de convite de porto. Exige login. |

## Workspace autenticado

Chrome com trilho de ícones (tooltips no desktop) e, no topo do trilho, o seletor de porto. Não vale para leitura pública nem para o editor (RN-70).

| URL | Significado |
|---|---|
| `/` | Ponte (dashboard): resumo da cartoteca, cartas recentes, atalhos. |
| `/biblioteca` | Cartoteca: lista do porto ativo, busca (título, resumo, tags e corpo), filtro por origem (minhas / compartilhadas), filtro por status e filtro por gabarito. |
| `/templates` | Gabaritos do porto ativo. |
| `/integrations` | Instrumentos: rumos de conexão MCP (endpoint, token, skill), catálogo agrupado de ferramentas e tokens pessoais. |
| `/porto` | Porto: identidade (nome e tema), tripulação, convites por link e zona de risco. |

## Componentes living

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Na leitura interativa o visitante pode marcar no **próprio navegador** (localStorage). Isso **não** altera o Markdown nem sincroniza entre aparelhos. Sem permissão de edição, a prévia declara que as marcações valem só naquele navegador.
