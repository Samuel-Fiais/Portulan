# Regras de negócio

Invariantes. Se o código divergir, o código está errado — ou esta regra precisa ser atualizada na mesma sessão da mudança.

Formato: **pode / não pode / acontece**. Sem caminho de arquivo.

## Carta e rascunho

- **RN-01** Salvar o rascunho não cria versão publicada e não incrementa `version`. Cmd/Ctrl+S e o botão **Salvar** seguem a mesma regra.
- **RN-02** Publicar só é permitido se o rascunho difere da última release (título, resumo, gabarito/paleta/logo, cartógrafo, frota, tags ou conteúdo). Sem diferença, recusar.
- **RN-03** Publicar cria um snapshot imutável, avança `version` e passa o status editorial para publicado.
- **RN-04** Links `/p/{id}` já emitidos não mudam de conteúdo quando o rascunho é editado ou republicado.
- **RN-05** `/d/{uuid}` aponta sempre para a release habilitada mais recente daquela carta.
- **RN-06** Excluir carta é irreversível e exige o UUID (`id`), não o slug.
- **RN-07** Título 3–180, resumo ≤ 500, cartógrafo/frota ≤ 100, até 12 tags (1–40), conteúdo ≤ 250.000.
- **RN-08** O slug público (`/d/{uuid}`) é um UUID definido na criação da carta. Renomear o título **não** altera o slug. Duas cartas podem ter o mesmo título. Slugs legados derivados do título continuam resolvendo via tabela de aliases até expirarem.
- **RN-09** Restaurar uma release no rascunho copia título, resumo, gabarito, cartógrafo, frota, tags e conteúdo daquela versão para o rascunho. Não altera releases existentes, não incrementa `version` e não publica automaticamente. Cartógrafo e editor convidado podem restaurar. O estado living já salvo no rascunho prevalece sobre o snapshot (RN-54).

## Acesso

- **RN-10** Só o cartógrafo (responsável pela carta) compartilha, altera papel, revoga, muda a visibilidade, move a carta de porto, desativa a carta inteira, duplica e exclui. Capitão e imediato do porto **não** herdam esses poderes.
- **RN-11** Editor convidado edita o rascunho e pode publicar (criar versão). Leitor não edita. Publicar não torna a carta visível a visitantes.
- **RN-12** Não compartilhar com o cartógrafo (mesmo e-mail ou mesma conta).
- **RN-13** Não duplicar convite para o mesmo e-mail na mesma carta. Papel igual ao atual não é alteração.
- **RN-14** Carta sem cartógrafo (legada) permanece acessível para leitura/edição no modo legado; os links `/d` e `/p` continuam legíveis sem login.
- **RN-15** Visitante sem login nunca vê rascunho. Só vê release habilitada de carta não desativada **e** em mar aberto (`visibility = public`).
- **RN-16** Toda carta nasce em camarote (`visibility = private`). Criar, duplicar ou publicar uma versão **não** muda o nível de visibilidade.
- **RN-17** Em camarote, `/d` e `/p` só abrem para o cartógrafo e para quem foi convidado nominalmente (leitor ou editor), autenticados. Em visibilidade de porto, abrem também para toda a tripulação do porto da carta, **em leitura**. Em mar aberto, qualquer pessoa com o link vê a release habilitada (RN-15), salvo carta ou versão desativados.
- **RN-18** Só o cartógrafo muda a visibilidade. O nível **porto** exige que a carta pertença a um porto: carta sem porto (legada) não pode ser aberta à tripulação. Visibilidade de porto dá leitura, nunca edição — editar exige convite nominal (RN-11).
- **RN-19** A carta nasce no porto ativo de quem a cria (agente: o porto do token, RN-55). O cartógrafo pode movê-la só para outro porto em que ele mesmo seja tripulante; mover não altera convites nominais nem releases publicadas. Carta em visibilidade de porto que muda de porto passa a ser lida pela tripulação do porto novo.

## Porto (workspace)

- **RN-86** Toda conta tem pelo menos um porto. Quem entra sem nenhum ganha o **porto inicial** (`isPersonal`), que não pode ser deixado nem excluído. Uma pessoa pode criar outros portos e entra neles como capitão.
- **RN-87** O porto ativo é da sessão, não da conta: fica em cookie. Cartoteca, Ponte e Gabaritos mostram só o porto ativo; cartas legadas (sem porto) continuam visíveis. Cartas compartilhadas nominalmente com a pessoa aparecem independentemente do porto ativo.
- **RN-88** Papéis do porto: capitão (`owner`, um por porto), imediato (`admin`) e tripulante (`member`). Capitão e imediato convidam, removem, mudam papéis e alteram o nome do porto. Ninguém muda o próprio papel. Imediato não altera nem remove outro imediato. O capitão não é removido nem rebaixado por troca de papel — a capitania só muda por transferência, e só o capitão transfere.
- **RN-89** Convite de porto é **link** (`/invite/{token}`), papel `admin` ou `member`, com validade (1d, 7d, 30d ou nunca) e limite de usos opcional (1–500). O token aparece uma única vez. Resgatar exige login e recusa convite revogado, expirado, esgotado ou de porto em que a pessoa já é tripulante. Capitania não se convida. Links `/convite/{token}` redirecionam para `/invite/{token}` (RN-107).
- **RN-90** Deixar o porto: tripulante e imediato saem; capitão precisa transferir a capitania antes. Ninguém fica sem porto — sair do último porto é recusado, e o porto inicial não pode ser deixado.
- **RN-91** Só o capitão exclui o porto, e só depois de o porto ficar **sem cartas, Expedições, Embarcações e Rumos**: mover ou excluir esse acervo vem antes. Porto inicial não é excluído.
- **RN-92** Gabaritos e tokens MCP pertencem ao porto onde foram criados. Toda a tripulação usa os gabaritos do porto; alteram e excluem o autor, o capitão e o imediato. Gabaritos internos seguem RN-30. Gabaritos particulares legados (sem porto) continuam só do dono.
- **RN-93** Convidado nominal que não faz parte da tripulação do porto da carta é sinalizado como **externo** na UI de compartilhamento. Externo tem exatamente o papel do convite (leitor ou editor) — nada mais.
- **RN-95** Mover um gabarito de porto exige capitania (capitão ou imediato) no porto atual **e** no de destino, porque o gabarito serve a tripulação inteira. Gabarito interno não se move. Cartas que já usam o gabarito continuam apontando para ele mesmo em outro porto: quem é o cartógrafo segue enxergando o gabarito da carta; para o resto da tripulação do porto antigo, a carta passa a exibir o gabarito Default.

## Publicação desligada

- **RN-20** Carta `disabled`: todos os `/d/` e `/p/` daquela carta mostram indisponibilidade.
- **RN-21** Release `disabled`: só aquele `/p/{id}` some. Se ainda existir release habilitada, `/d/{slug}` continua na mais recente habilitada.
- **RN-22** Sem nenhuma release habilitada, `/d/{slug}` é indisponível mesmo com a carta ativa.

## Gabaritos (templates)

- **RN-30** Gabarito interno não pode ser excluído.
- **RN-31** Gabarito do porto é alterado ou excluído pelo autor, pelo capitão ou pelo imediato daquele porto (RN-92). Gabarito particular legado, só pelo dono.
- **RN-32** Mudar o gabarito de uma carta já criada altera paleta/logo da prévia do rascunho; não reescreve releases antigas.

## Markdown e componentes

- **RN-40** `:::checklist` é só para tarefas rastreáveis (`- [ ]` / `- [x]`). Critérios, sintomas e listas informativas usam bullets Markdown.
- **RN-41** Novo bloco de relatório entra no catálogo único. Não há segunda lista de categorias no editor.
- **RN-42** Card `:::report` aponta para o link estável `/d/{uuid}` de uma carta **publicada**. `:::report` e `:::image` são diretivas void (uma linha, só atributos): corpo acidental ou `:::` de fechamento é descartado na renderização e não deve ser escrito pelo autor.
- **RN-43** Checklist e testcase com estado durável: quando o leitor autenticado pode editar a carta, toggles reescrevem o Markdown fonte (`- [ ]`/`[x]` ou `status` do testcase) via salvamento debounced no rascunho **e**, em leitura pública editável (`/d/` ou `/p/` com permissão), também na release exibida — para o estado sobreviver ao refresh da mesma URL. Sem permissão de edição, checklist pode usar cache local do navegador; testcase permanece somente leitura.
- **RN-44** `:::testcase` exige `id` único na carta. Status permitidos: `pending`, `ok`, `partial`, `error`. Preferir testcase a tabelas largas para cenários de QA.
- **RN-45** Upload de anexo de relatório (`:::file`) aceita qualquer tipo de arquivo até 5 MB; imagens em `:::figure` continuam restritas a PNG, JPG, WEBP, SVG e GIF. Logo de gabarito permanece só imagem.
- **RN-46** `:::file` exige `url` e `name` (nome original com extensão). O card renderizado mostra a extensão em destaque e link para abrir/baixar o arquivo.
- **RN-47** Em blocos de linhas com colunas (`:::properties`, `:::kv` e similares), a coluna **valor** aceita Markdown inline (links, negrito, código) com a mesma política de segurança do restante do relatório; URLs cruas continuam virando link automático quando aplicável.
- **RN-48** Blocos de código com linguagem `mermaid` renderizam diagrama SVG na prévia, leitura pública e PDF, usando a paleta do gabarito (flowchart, sequência e estado). Se o autor já incluir `%%{init:…}%%`, o init customizado prevalece.
- **RN-49** Títulos `##` e `###` recebem âncoras estáveis derivadas do texto (acentos removidos, minúsculas, hífens); títulos repetidos recebem sufixo numérico. Um índice navegável na capa lista essas seções na prévia do editor, na prévia de rascunho, nas vistas públicas `/d` e `/p` e na exportação PDF.

## MCP

- **RN-50** Toda chamada MCP exige `Authorization: Bearer` com chave MCP válida.
- **RN-51** O agente opera com a identidade e as permissões daquele usuário — não há bypass de dono.
- **RN-52** Preferir `update_document` em carta existente; não duplicar o assunto com `create_document`. Para clonar uma carta inteira, usar duplicar na UI ou `duplicate_document` no MCP.
- **RN-53** Upload via MCP (`upload_image`, `upload_file`) usa o mesmo Blob, limites (RN-45) e prefixo por usuário/carta da UI; exige token MCP válido e permissão de edição na carta de destino.
- **RN-54** Ao substituir o Markdown do rascunho (MCP `update_document`, `publish_document` com `content`, ou qualquer API que envie `content` completo), o servidor **preserva o estado living já salvo** no rascunho atual: para cada `:::testcase` com o mesmo `id`, mantém o `status` do rascunho (ignora o `status` do payload); para cada item de `:::checklist` com o mesmo título (primeira coluna, comparação normalizada), mantém `[x]`/`[ ]` do rascunho. Itens novos no payload usam o estado do agente; itens removidos do payload somem. O rascunho prevalece sobre o incoming — agentes não resetam marcações do usuário via replace de conteúdo.
- **RN-55** O token MCP está preso ao porto ativo no momento em que foi gerado. Cartas e gabaritos criados pelo agente nascem nesse porto; `list_documents` enxerga o mesmo recorte que a cartoteca daquele porto (mais as cartas compartilhadas nominalmente). `list_workspaces` diz quais portos a pessoa tem e qual deles o token opera. O agente também abre porto novo (`create_workspace`, entrando como capitão) e move carta ou gabarito para outro porto (`workspace_id` em `update_document` e `update_template`), sempre sob as regras de quem move (RN-19, RN-95) — mas o token continua preso ao porto de origem. Trocar de porto na UI **não** move o token: para operar em outro porto, gerar um token novo nele.

## Publicação

- **RN-63** Diff de versões compara snapshots publicados e o rascunho atual (metadados + Markdown). Não altera conteúdo; só leitura na aba Histórico do editor.

## PDF

- **RN-64** O PDF exportado mantém os links do relatório clicáveis: Markdown, índice (`##`/`###`), cards de outro relatório e URLs. Âncoras internas saltam na mesma versão; o restante abre no navegador.
- **RN-71** PDF do rascunho (menu **Exportar PDF** do editor) usa o conteúdo atual do rascunho. PDF de versão publicada (aba **Histórico**) usa o snapshot imutável da release escolhida, com metadados e paleta daquela versão. Ambos exigem autenticação e acesso à carta. Não há exportação PDF anônima em `/d` ou `/p`.

## Editor

- **RN-62** Com alterações no rascunho ainda não persistidas, fechar ou sair da aba do editor exibe aviso do navegador (`beforeunload`). Após o salvamento manual concluir, o aviso deixa de aparecer.

## Chrome do workspace

- **RN-70** A navegação do workspace aparece só nestes destinos, nesta ordem: Ponte, Cartoteca, Gabaritos, Expedições, Embarcações, Rumos, Instrumentos e Porto. A ordem segue o trabalho: resumo e acervo editorial, depois coordenação de desenvolvimento (Expedição agrupa Embarcações e Rumos), depois instrumentos e tripulação. No desktop o trilho alterna entre compacto (ícones com tooltips) e expandido (rótulos visíveis); a escolha fica no navegador. Cada destino é um item próprio no trilho (compacto e expandido) e no drawer estreito; não há menu Acervo. O seletor de porto fica no topo. Não aparece na leitura pública (`/d`, `/p`), na prévia do rascunho, na exportação PDF nem no editor.
- **RN-107** As URLs autenticadas e o convite de porto usam os identificadores técnicos em inglês (`/library`, `/templates`, `/projects`, `/context-packs`, `/repositories`, `/integrations`, `/workspace`, `/invite/{token}`, `/documents/{id}`). A copy da UI permanece em pt-BR náutico. Caminhos em português emitidos antes desta regra redirecionam para o equivalente em inglês, preservando o restante do caminho e o token do convite.

## Revisão

- **RN-60** Status `review` é rótulo editorial; não dispara fila de aprovação automática.
- **RN-61** Comentários de revisão só no editor autenticado, para quem já tem acesso à carta (cartógrafo, editor, leitor ou tripulação em visibilidade de porto). Sem comentário anônimo em `/d` ou `/p`. O comentário-raiz pode ancorar a qualquer bloco visível na prévia do rascunho (capa, título `##`/`###`, parágrafo ou componente) e pode citar um trecho; sem âncora vale para a carta inteira. Vários fios podem ancorar o mesmo bloco, cada um com o próprio trecho; o marcador do bloco abre todos. A âncora e o trecho são do instante do comentário: se o rascunho mudar, o fio continua visível.
- **RN-65** Resposta só a um comentário-raiz da mesma carta. Um nível: resposta não tem respostas aninhadas. A resposta herda âncora e trecho do raiz. Remover o raiz remove o fio. Cada autor remove o próprio comentário (raiz ou resposta).
- **RN-66** Estado resolvido pertence ao comentário-raiz do fio. Quem pode comentar na carta (RN-61) pode resolver e reabrir. Fio resolvido permanece visível na prévia e na aba Revisão; some só se o autor remover o raiz. A aba Revisão filtra abertos, resolvidos ou todos. Sem e-mail ou notificação.

## Conta e autenticação

- **RN-80** Handle e e-mail (quando houver) são únicos, comparação sem maiúsculas. Cadastro com senha exige handle, e-mail, nome e senha de pelo menos 8 caracteres. Sem e-mail de confirmação.
- **RN-81** Entrar com senha aceita handle **ou** e-mail, mais a senha. GitHub permanece no mesmo ecrã de acesso.
- **RN-82** Uma conta tem GitHub, senha, ou os dois. Não pode desligar o último método. Cadastro com senha **não** mescla em silêncio: e-mail ou handle já usados recusam e pedem para entrar.
- **RN-83** Mescla na mesma conta: (1) quem já entrou define ou troca a senha, ou conecta o GitHub, no modal da conta; (2) login GitHub cujo e-mail já existe em conta **sem** GitHub anexa o GitHub a essa conta. GitHub já ligado a outra conta recusa.
- **RN-84** Clique na foto de perfil abre o modal da conta (não um menu só com Sair). O modal mostra nome, handle, e-mail e foto, métodos de entrada, o seletor de tema (cinco papéis, claro/escuro e personalizado), atalho para Instrumentos e Sair. Sem recuperação por e-mail: quem esqueceu a senha só recupera se a conta já tiver GitHub.
- **RN-85** Há cinco papéis (Carta, Pergaminho, Névoa, Costa, Lacre), cada um com modo claro e escuro e tinta de ação própria, mais **Personalizado**: ao escolher, a pessoa abre o seletor e define a cor livremente; essa tinta vira a ação do chrome naquele modo. Valor legado claro/escuro vira Carta no mesmo modo. A marca de três barras e as tintas de tipo de carta não mudam com o tema. PDF e impressão permanecem papel branco Carta.
- **RN-94** O papel (tema visual) é **por pessoa e por porto**: escolher um swatch pinta a tela na hora e grava a preferência local daquele porto neste navegador — o mesmo comportamento no trilho **Tema**, em `/workspace` e no modal da conta (sem porto). Capitão e imediato **não** impõem papel para a tripulação. Os campos `themePaper` / `themeMode` / `themeInk` do porto servem só de partida na primeira visita, antes de haver preferência salva. Tela de acesso e leitura pública, que não têm porto, usam a preferência local geral do navegador.

## Contexto de desenvolvimento

- **RN-96** Expedição e Embarcação pertencem ao porto. Toda consulta e mutação respeitam o porto ativo (UI) ou o porto do token (MCP). Nada de outro porto vaza.
- **RN-97** Path absoluto de checkout não é persistido como verdade global do servidor. Só identidade lógica, remote URL e scopes relativos. Checkout é informado localmente pelo cliente ou CLI.
- **RN-98** `Document.status` permanece rótulo editorial das cartas. Porto não é Expedição. Expedição não herda papéis de carta nem substitui tripulação.
- **RN-99** Aprovar um Rumo exige confirmação explícita, fontes formais apontando para release imutável e nenhuma pergunta bloqueadora aberta. Quem aprova: responsável do Rumo, capitão ou imediato. Enquanto está em rascunho ou revisão, o Recorte inteiro — resultado esperado, escopo, não-escopo e plano de navegação — pode ser editado. Aprovar cria revisão imutável; a revisão anterior permanece auditável e o Rumo anterior fica `superseded` se for substituído. Revisão aprovada **não** se reedita: corrigir Recorte, itens, fontes ou Marcos exige ação explícita de **nova revisão**, que copia o conteúdo para rascunho e preserva o histórico. Publicar carta privada **não** abre o conteúdo para tornar fonte versionada.
- **RN-100** Nova release de uma Carta-fonte **não** altera nem invalida Rumos anteriores. O sistema marca validade `needs_review` e sinaliza que há edição nova para revisar. Recuperar o Rumo é criar uma nova revisão (RN-99). MCP não serve briefing desatualizado como se fosse válido.
- **RN-101** MCP, por padrão, só serve revisão `approved` com validade `current`. Bloqueio, pergunta aberta bloqueadora ou contexto desatualizado devolve diagnóstico estruturado (`pack_not_servable`), nunca um briefing meio pronto. Listar ou assumir Manobra de código também exige esse recorte servível.
- **RN-102** Conteúdo de cartas, itens de Rumo, mensagens de agentes e relatórios é dado não confiável. Nunca é instrução privilegiada do sistema.
- **RN-103** Assumir, renovar, soltar o comando e registrar progresso ou resultado são operações atômicas **por linha** (Manobra ou Lance). Há um único lease ativo por linha. Progresso e resultado só pelo detentor do lease ativo daquela linha, no estado permitido. Lease expirado não registra sem retomada regular. Outro token — inclusive da mesma pessoa — não registra em lease alheio. `accepted` nunca volta para `in_progress` ou `reported` por registro. Renovar exige atividade explícita. Se uma revisão nova do Rumo surgir durante trabalho ativo, o contexto **não** troca em silêncio: o agente precisa escolher. Assumir a Manobra **não** toma o lease nem o responsável dos Lances (RN-113, RN-115). Delegar responsável não cria lease (RN-115).
- **RN-104** Token MCP não tem mais acesso que o responsável humano e o porto a que foi vinculado. A cada uso, o servidor revalida a participação no porto: sem tripulação, a chave é rejeitada na requisição. Remover alguém da tripulação revoga as chaves daquele porto. `clientInfo` observado não concede privilégio nem prova o aplicativo — o valor fica associado ao token só para auditoria. O servidor só afirma com segurança qual credencial foi usada. Token nunca é gravado em texto puro.
- **RN-105** Agente MCP com chave válida tem paridade com o responsável humano no porto: tudo que a tripulação faz via MCP, o agente pode fazer, salvo ferramentas explicitamente desabilitadas na identidade (RN-111). Isso inclui montar Rumo (itens, fontes, Marcos, plano), criar Manobras, enviar para revisão, aprovar, abrir nova revisão e aceitar resultado — pelas ferramentas MCP correspondentes. Manobra de código só se a sessão reconhecer de verdade uma Embarcação do porto compatível com a Manobra. Embarcação informada precisa existir no porto e corresponder à Manobra; ausência não é reconhecida automaticamente. O campo legado `workMode` no banco não restringe capacidade.
- **RN-111** Toda chave MCP nova cria uma identidade nomeada no porto (passo 02 em Instrumentos). Na criação, a UI mostra todas as ferramentas MCP agrupadas, **todas marcadas** por padrão. O responsável pode desmarcar ferramentas por segurança — **na criação ou depois**, em **Editar permissões** — e a lista gravada na identidade vale para toda chave emitida daquele agente. Chamar ferramenta desabilitada devolve erro MCP. Identidades legadas sem lista gravada tratam como catálogo completo. Chaves legadas sem identidade continuam válidas até revogação, com catálogo completo.
- **RN-106** O CLI `portulan init` nunca grava token em `.portulan/config.json`, `AGENTS.md`, `CLAUDE.md` ou logs. Blocos gerenciados (`BEGIN:portulan-dev-context`) não apagam conteúdo preexistente. Editar arquivo existente pede confirmação. `init` é idempotente: reusa Embarcação já registrada e cria o vínculo real com a Expedição escolhida.
- **RN-108** Campos de criação em coordenação não aceitam vazio nem só espaço. Mensagem de Conversa de bordo (abrir fio ou responder) é obrigatória, até 2000 caracteres — o carimbo **Enviar** não dispara sem texto. Item de contexto exige texto. Nome de Expedição e de Embarcação: 2–80. Título de Rumo: 3–180. Objetivo da Manobra, descrição do Marco e resumo do Registro de bordo também não nascem vazios. Plano de navegação e objetivo da Expedição continuam opcionais. Registro de bordo sem resumo não aparece na lista. Resultado só se registra uma vez, enquanto a Manobra está em andamento — não em `reported` nem `accepted`. Aceite só em `reported`, depois de o revisor ver evidências, lacunas e cobertura dos Marcos.
- **RN-109** Maré contrária é um **tipo de fio**, escolhido ao abrir a Conversa de bordo — não um extra no envio. Responder um fio já aberto não muda o tipo. Conversa comum não bloqueia. Na Manobra, o estado fica `blocked` enquanto existir ao menos uma Maré contrária aberta; resolver um entre vários bloqueios não libera. Quando a última for resolvida, a Manobra volta ao estado anterior válido. Agente autorizado lê o corpo das mensagens do fio, não só os metadados.
- **RN-110** Identidade de agente MCP pertence a um responsável humano. Só esse responsável edita a identidade, emite/revoga chave, **desativa**, **reativa** ou **exclui** o agente. Capitão e imediato não herdam esse poder. Desativar revoga todas as chaves da identidade; chaves existentes param de funcionar no MCP. Reativar permite emitir chave nova. Excluir remove a identidade do porto e revoga as chaves — irreversível; o Diário de bordo histórico permanece. A UI mostra o responsável real — nunca o usuário da sessão no lugar dele.
- **RN-112** Agente de bordo aparece na tripulação do porto como **tipo distinto** de membro (`humano` vs `agente de bordo`). Toda a tripulação vê os agentes do porto (ativos e inativos). Agente **não** recebe papel de capitão, imediato ou tripulante, **não** entra por convite e **não** aparece em ações de remover ou transferir capitania. Gestão (chaves, ferramentas, desativar, reativar, excluir) continua só com o responsável humano (RN-110). A lista mostra nome do agente, responsável, status e atalho para Instrumentos quando quem vê é o responsável.
- **RN-113** Lance só existe sob Manobra-raiz (um nível). O comando (lease) é por linha: dá para assumir a **Manobra mesmo quando ela tem Lances**, e ao mesmo tempo um Lance — inclusive se o Lance for de outra pessoa ou agente. Assumir o pai não reatribui, não solta e não bloqueia os filhos. Resultado da Manobra só se todos os Lances estão `reported` ou `accepted`. Aceite humano continua na Manobra; aceitar o pai promove Lances `reported` para `accepted`.
- **RN-114** Comentário de bordo sem fio e sem Maré entra no fio de discussão aberto daquele sujeito (um por sujeito); se não houver, cria. Maré contrária continua fio próprio (RN-109). Menção a tripulante ou agente grava os IDs no recado — não é notificação, e-mail nem inbox.
- **RN-115** Delegar atribui responsável (tripulante ou agente de bordo) à Manobra ou ao Lance. Não cria lease. Se a Manobra está sem responsável, o mesmo responsável vai aos Lances que também estão sem responsável; Lance que já tem dono não muda. Reatribuir Manobra que já tem dono não cascateia. Delegar um Lance vale só para ele. Limpar responsável não cascateia.
- **RN-116** Rumo, Manobra, Lance, item de contexto, carta-fonte, Marco, fio e recado têm identificador inteiro único no porto. A UI mostra `#42` e copia o número. UUID não é o identificador copiável. MCP e UI resolvem `42` ou `#42` no porto.
- **RN-117** Enquanto o Rumo está em rascunho ou revisão, a tripulação pode **remover** Manobras e Lances e **ajustar o estado** manualmente na UI (`available`, `claimed`, `in_progress`, `reported`). Não dá para marcar `accepted` manualmente (use aceitar resultado), nem `blocked` (Maré contrária via Conversa de bordo, RN-109). Manobra aceita não muda de estado manualmente (RN-103). Remover Manobra com Lances apaga os filhos. Telas de detalhe (Rumo, Manobra, Lance, Expedição, Embarcação) têm controle de voltar.
- **RN-118** Manobra e Lance podem ter **cartas-fonte vinculadas** (`implementationTaskSource`), independentemente do estado do Rumo. Qualquer tripulante do porto vincula ou remove. Fonte formal exige edição imutável, como no Rumo. **Finalizada** = a linha em `reported` ou `accepted`; Manobra com Lances exige todos os filhos finalizados e ela mesma finalizada. Ao registrar resultado ou aceitar, o agente **deve** criar ou atualizar uma Carta documentando objetivo, entregas, decisões e links de código/PR quando relevante, e vinculá-la como carta-fonte da linha. Guia do Agente, bootstrap MCP e skill `portulan-mcp` reforçam essa obrigação.

## Colaboração ao vivo e auditoria MCP

- **RN-119** Realtime é infraestrutura transversal do porto, não uma feature só do editor. Presença, atividade e eventos autorizados valem para os artefatos do porto (cartas, gabaritos, Rumos, planos, Expedições, Embarcações, Manobras, compartilhamentos e aprovações).
- **RN-120** Conteúdo mutável (rascunho de carta, gabarito, Rumo em rascunho ou revisão, plano de navegação) muda por **operações colaborativas** versionadas e idempotentes. Publicação, release, visibilidade, aprovação de Rumo, lease, Maré contrária e aceite humano continuam **comandos atômicos** autorizados no servidor. Releases publicadas e revisões aprovadas de Rumo **não** se editam ao vivo: nova publicação ou nova revisão (RN-03, RN-99). O canal ao vivo não contorna permissão, lease, aprovação, publicação nem aceite.
- **RN-121** Cada sala é autorizada por porto, entidade e papel (ou convite nominal, quando a entidade for carta). Revogar participação no porto ou o acesso à entidade encerra a presença na hora e impede novos eventos e comandos protegidos daquela sala.
- **RN-122** Toda chamada MCP autenticada — leitura, sucesso, recusa ou falha atribuível — gera evento no Diário de bordo, com identidade, ferramenta, alvo, resultado, duração e correlação. Nunca grava token em texto puro, segredo, anexo nem o Markdown integral. Presença e payloads de atividade levam o mínimo necessário; retenção e redaction aplicam-se (RN-106).
- **RN-123** Agente de bordo aparece na presença e na atividade com identidade e intenção. Colabora só dentro das ferramentas habilitadas (RN-111). Não burla lease, aprovação nem aceite humano (RN-103, RN-105).
- **RN-124** Postgres permanece a fonte de snapshots, releases, autorização e auditoria. O canal realtime replica e ordena eventos autorizados; não é a única fonte de verdade. Reconexão, ordem e conflitos de edição se resolvem com versionamento e idempotência — não com sobrescrita silenciosa.
