# Fluxos

Caminhos que o produto promete. Se a jornada mudar, atualize aqui e as `RN-xx` envolvidas.

## Entrar e criar conta

1. Na tela de acesso, a pessoa entra com GitHub **ou** com handle/e-mail e senha.
2. Para criar conta com senha: informa nome, handle, e-mail, senha e confirmação. Handle ou e-mail já usados recusam; o sistema pede para entrar (não mescla). O cadastro já cria o **porto inicial** da conta.
3. Primeiro login GitHub cria a conta. Se o e-mail do GitHub já existir em conta **sem** GitHub, o GitHub é anexado a essa conta.
4. Na primeira entrada, a conta ganha o **porto inicial** (`Porto de {nome}`) e já navega nele (RN-86).
5. Depois de entrar, o clique na foto abre o modal da conta: dados, métodos (definir/trocar senha, conectar ou desligar GitHub), chaves MCP, seletor de tema e Sair. Não dá para desligar o último método.
6. Não há e-mail de confirmação nem “esqueci a senha”. Recuperação só se a conta já tiver GitHub: entrar pelo GitHub e redefinir a senha no modal.

Regras: RN-80 a RN-86.

## Percorrer o trilho

1. Depois de entrar, a pessoa cai na Ponte do porto ativo.
2. O trilho lista Ponte → Cartoteca → Gabaritos → Porto (RN-70).
3. Da Ponte ou da Cartoteca abre a carta; carta nova começa por um gabarito.
4. Chaves MCP ficam no modal da conta. Porto cuida da identidade e da tripulação.

Regra: RN-70.

## Criar e trocar de porto

1. Com mais de um porto, o seletor no trilho mostra o porto ativo. Com um porto só, o seletor fica na tela do Porto.
2. Escolher outro porto grava a preferência na sessão e recarrega a Cartoteca, a Ponte e os Gabaritos naquele acervo (RN-87).
3. **Novo porto** pede só o nome. Quem cria entra como capitão, e o porto novo já vira o ativo.
4. **Abrir o porto** leva a `/workspace`: identidade (nome do porto e papel pessoal), tripulação, convites e zona de risco.

Regras: RN-86, RN-87, RN-88, RN-107.

## Convidar e organizar a tripulação

1. Em `/workspace`, capitão ou imediato gera um convite escolhendo papel (imediato ou tripulante), validade (1 dia, 7 dias, 30 dias ou nunca) e limite de usos opcional.
2. O link `/invite/{token}` é copiado na hora — o token não aparece de novo. Convites ativos ficam listados e podem ser revogados.
3. Quem recebe abre o link, entra (ou cria conta) e confirma. Convite revogado, expirado, esgotado ou de porto onde já é tripulante é recusado com o motivo.
4. Na lista de tripulação, capitão e imediato promovem ou rebaixam entre imediato e tripulante e removem pessoas.
5. Ninguém mexe no próprio papel; imediato não mexe em outro imediato.
6. O capitão transfere a capitania para alguém da tripulação; ele passa a imediato e a outra pessoa assume o comando.

Regras: RN-88, RN-89, RN-107, RN-112.

## Escolher o papel (tema)

1. No trilho **Tema**, em `/workspace` (**Seu papel**) ou no modal da conta, a pessoa escolhe um dos cinco papéis (claro/escuro) ou **Personalizado**.
2. A escolha pinta a tela **na hora** e fica gravada neste navegador — por porto quando há porto ativo, ou global na tela de acesso e leitura pública.
3. Cada tripulante pode ter um papel diferente no mesmo porto; ninguém impõe tema para os outros.

Regras: RN-85, RN-94.

## Deixar ou afundar um porto

1. Tripulante e imediato usam **Deixar o porto**. O capitão precisa transferir a capitania antes; o porto inicial e o último porto da pessoa não podem ser deixados.
2. Só o capitão exclui um porto, e só quando ele está sem cartas: mover ou excluir esse acervo vem primeiro. O porto inicial não é excluído.
3. Ao sair ou excluir, a pessoa cai no primeiro porto que ainda lhe resta.

Regras: RN-90, RN-91.

## Criar carta

1. Pessoa escolhe um gabarito (ou o Default).
2. Informa título (obrigatório) e resumo opcional.
3. O sistema cria um rascunho (`draft`) no **porto ativo**, com a pessoa como cartógrafo, em **camarote**, com slug UUID fixo (igual ao `id`) e conteúdo-base do gabarito. O título pode ser alterado depois sem mudar o link `/d/{uuid}`. Ninguém além do cartógrafo vê a carta até ele mudar a visibilidade ou convidar alguém.

Agente: `list_documents` (evitar duplicata de assunto) → `create_document`. A carta nasce no porto do token (RN-55).

Regras: RN-07, RN-16, RN-19, RN-52, RN-55.

## Editar e salvar

1. Da Cartoteca (ou da Ponte, pelos recentes), a pessoa abre a carta.
2. Cartógrafo ou editor altera título, resumo, Markdown, metadados ou gabarito. Quando a sala ao vivo aceita operar (RN-120), título, resumo e corpo do rascunho sincronizam por `content.operation` com `baseVersion`/`draftVersion`, em debounce — sem sobrescrever o rascunho inteiro a cada tecla; metadados e gabarito continuam pelo **Salvar** clássico.
3. O rascunho é gravado por Cmd/Ctrl+S ou pelo botão **Salvar** (flush das operações pendentes + metadados). Base defasada devolve conflito visível ou rebase automático com nova tentativa, sem clobber silencioso (RN-124). Não publica. Não gera `/p` novo. Com alterações ainda não gravadas, sair da aba pode exibir aviso do navegador.
4. Prévia ao lado reflete o rascunho no mesmo papel de leitura da vista pública (folha web, índice quando há `##`/`###`); “Abrir prévia” abre o rascunho autenticado em outra aba. A impressão/PDF continua A4 e os links do relatório permanecem clicáveis.
5. Atalhos no textarea: Cmd/Ctrl+B (negrito), I (itálico), K (link), Cmd/Ctrl+Shift+C (modal **Adicionar componente**), Tab / Shift+Tab (indentar linha ou bloco selecionado).
6. Colar imagem (PNG, JPG, WEBP ou GIF) no textarea envia pelo Blob e insere `:::figure` no cursor, com os mesmos limites de RN-45. Arquivos genéricos continuam na modal **Adicionar componente** → **Arquivo** (`:::file`).
7. Anexos: na modal **Adicionar componente**, escolher **Arquivo**, enviar o arquivo (qualquer tipo, até 5 MB) e inserir `:::file{url name title?}`. Imagens também podem ser enviadas em **Imagem** (`:::figure`).
8. Voltar no editor retorna à Cartoteca.
9. No menu de ações, **Baixar Markdown** grava o rascunho se houver alterações pendentes e baixa o conteúdo como `{slug}.md`.

Regras: RN-01, RN-08, RN-11, RN-45, RN-46, RN-62, RN-49, RN-64, RN-120, RN-124.

## Duplicar gabarito

1. Na tela Gabaritos, a pessoa aciona **Duplicar** em qualquer gabarito acessível (Default interno ou do porto).
2. O sistema cria um gabarito no porto ativo com nome `Cópia de {nome original}`, copiando paleta, logo e conteúdo-base.
3. O clone aparece na grade; toda a tripulação pode usá-lo (RN-92).

Funcionalidade: F-duplicar-template-ui.

Regras: RN-31, RN-92.

## Filtrar a cartoteca

1. Na Ponte, os cards de resumo levam à Cartoteca já filtrada por status (todos, publicado, revisão, rascunho ou arquivado).
2. Na Cartoteca, a pessoa combina filtro de origem (todos, minhas ou compartilhadas comigo), filtro de status, filtro de gabarito e busca local em título, resumo e tags.
3. A lista mostra o **porto ativo** (mais as cartas compartilhadas nominalmente e as legadas sem porto). Trocar de porto troca o acervo (RN-87).
4. Cada linha exibe selo **Minha** ou **Compartilhada** conforme o cartógrafo da carta, além do selo de visibilidade.

Funcionalidade: F-filtro-status, F-filtro-origem, F-stats.

Regras: RN-87.

## Publicar

1. Só se o rascunho difere da última release (RN-02).
2. Snapshot imutável + `version` + 1.
3. Devolve `/d/{uuid}` (sempre a última habilitada) e `/p/{releaseId}` (esta versão).
4. A visibilidade **não muda**: em camarote, o link só abre para cartógrafo e convidados; em visibilidade de porto, também para a tripulação; em mar aberto, para qualquer pessoa com o link.
5. Edições seguintes no rascunho não alteram `/p` antigos.

Regras: RN-02, RN-03, RN-04, RN-05, RN-16.

## Escolher a visibilidade da carta

1. Só o cartógrafo escolhe. O controle de visibilidade fica ao lado de Publicar no editor e também em Compartilhar e nos Metadados.
2. **Camarote**: só cartógrafo e convidados nominais.
3. **Porto**: toda a tripulação do porto da carta passa a ler (rascunho e versão publicada). Ninguém da tripulação edita sem convite nominal. Exige que a carta pertença a um porto.
4. **Mar aberto**: qualquer pessoa com `/d` ou `/p` vê a versão publicada habilitada.
5. Descer o nível retira o acesso de quem ele cobria; cartógrafo e convidados nominais continuam.

Regras: RN-10, RN-15, RN-17, RN-18.

## Restaurar versão no rascunho

1. Na aba Histórico do editor, cartógrafo ou editor escolhe uma versão publicada e confirma “Restaurar no rascunho”.
2. O sistema copia título, resumo, gabarito, cartógrafo, frota, tags e conteúdo daquela release para o rascunho.
3. Releases já publicadas permanecem intactas; `version` da carta não avança.
4. Para registrar o rascunho restaurado como nova versão, a pessoa usa Publicar (se houver diferença em relação à última release).

Regras: RN-01, RN-04, RN-09, RN-11, RN-54.

## Baixar PDF de versão publicada

1. Na aba **Histórico** do editor, quem tem acesso à carta abre **Mais** na versão desejada e escolhe **Baixar PDF**.
2. O sistema gera A4 com cabeçalho/rodapé e links clicáveis a partir do snapshot imutável daquela release (metadados e paleta da versão), não do rascunho atual.
3. O menu **Exportar PDF** do editor continua no rascunho. Não há PDF anônimo em `/d` ou `/p`.

Regras: RN-64, RN-71.

## Compartilhar

1. Só o cartógrafo convida por e-mail (`viewer` ou `editor`).
2. Recusar: o próprio cartógrafo, e-mail já convidado, papel idêntico ao atual.
3. Editor passa a editar; leitor só lê. Avatares no editor.
4. Convidado que não é da tripulação do porto da carta aparece com selo **Externo** (RN-93). O selo não muda o papel; serve para o cartógrafo ver quem está fora do porto antes de subir a visibilidade.
5. Convidados autenticados acessam o editor e, se houver versão publicada, também `/d` e `/p`, mesmo em camarote.

Regras: RN-10 a RN-13, RN-17, RN-93.

## Revisar com comentários

1. Cartógrafo, editor, leitor convidado ou tripulante (em visibilidade de porto) abre a carta no editor.
2. Na prévia, seleciona um trecho ou aciona o marcador de um bloco para abrir os fios daquele bloco (cada trecho citado é um fio); ou escreve um comentário geral na aba **Revisão**.
3. Quem tem acesso responde no mesmo fio. Autor remove o próprio comentário; remover o raiz encerra o fio.
4. Links públicos (`/d`, `/p`) não exibem nem aceitam comentários.

Regras: RN-60, RN-61, RN-65.

## Leitura pública

1. Visitante abre `/d/{uuid}` ou `/p/{id}`.
2. Fora de mar aberto: sem login, pedir autenticação; logado sem direito de leitura, negar acesso. Cartógrafo, convidados e (em visibilidade de porto) a tripulação veem o snapshot publicado.
3. Se a carta está desativada, ou a release está desativada (e no `/d` não há outra habilitada), ver indisponibilidade — não o rascunho.
4. Em mar aberto, o conteúdo é o snapshot publicado, com paleta daquela versão.
5. Se o relatório tem títulos `##` ou `###`, a capa exibe um índice navegável; cada título recebe âncora para saltar à seção. O mesmo índice aparece na prévia do editor.

Regras: RN-15, RN-16, RN-17, RN-18, RN-20 a RN-22, RN-48, RN-49.

Funcionalidade: F-indice.

## Comparar versões

1. Na aba **Histórico** do editor, escolher comparar o rascunho com a última release (quando há alterações pendentes), duas releases, ou uma release específica com o rascunho ou outra release.
2. O modal mostra metadados (título, resumo, gabarito, cartógrafo, frota, tags) e linhas do Markdown adicionadas/removidas, com legenda visual (− removido / + adicionado) e contagem de alterações.
3. Cartógrafo ou editor convidado pode restaurar uma release no rascunho direto do modal (com confirmação), quando pelo menos um dos lados é uma versão publicada.

Regras: RN-01, RN-02, RN-09, RN-63.

## Desativar

- Carta inteira: todos os links públicos saem do ar; reativação restaura conforme versões ativas.
- Uma versão: só aquele `/p/{id}`.

Regras: RN-10, RN-20, RN-21.

## Agente (MCP)

1. No modal da conta, a pessoa gera uma chave MCP com nome e validade. A chave aparece uma vez e fica presa ao porto ativo (RN-55). Não cria identidade de agente (RN-111).
2. O cliente envia o Bearer em toda chamada.
3. O agente lista, lê, edita e publica como essa pessoa, no recorte do porto do token. `list_workspaces` mostra os portos e qual deles o token opera.
4. Para restaurar uma versão publicada no rascunho: `list_document_releases` → `restore_document` (RN-09).
5. Para imagens ou anexos: `upload_image` / `upload_file` → URL → `update_document` com `:::figure` ou `:::file`.
6. Para revisão: `list_document_comments` → `create_document_comment` → `resolve_document_comment` ou `delete_document_comment`. Sem comentário em `/d` ou `/p`.

Regras: RN-09, RN-45, RN-46, RN-50 a RN-55, RN-61, RN-65.

## Excluir

Cartógrafo confirma. Remove a carta e as releases. Irreversível. Agente precisa do UUID.

Regra: RN-06.

## Setup do agente

1. **Humano:** gera a chave no modal da conta e cola o guia no chat (com `ptl_…` na mesma mensagem).
2. **Agente:** configura o cliente MCP, exporta `PORTULAN_TOKEN` e testa o endpoint. A primeira ferramenta útil é `get_system_guide`.

O humano não configura terminal nem arquivos MCP.

Regras: RN-50, RN-55, RN-111.

Funcionalidades: F-mcp-token.

## Colaborar ao vivo no porto

1. Quem tem acesso ao artefato entra na **sala** daquele assunto no porto ativo. A autorização é a mesma da UI e do MCP (porto, papel, convite nominal). Sem acesso, a sala não abre — e a presença nunca revela artefato que a pessoa não poderia ler.
2. Ao entrar, a sessão declara **intenção**: `lendo`, `editando`, `revisando`, `executando` (agente com comando ativo) ou `aguardando`. A presença mostra identidade, intenção, estado (`ativo`, `ocioso`, `desconectado`) e foco. Agente aparece com identidade própria e responsável (“Nome via Agente”).
3. Mudanças autorizadas de conteúdo mutável e de estado aparecem para os outros participantes sem recarregar, na ordem da sequência da sala.
4. Conteúdo mutável (rascunho de carta e gabarito) aplica-se por **operação** com `opId` e `baseVersion`. Dois participantes não se apagam em silêncio.
5. Publicar, desativar, mudar visibilidade, mover de porto, excluir, convidar, revogar, mudar papel e transferir capitania seguem **comandos atômicos** no servidor. A sala anuncia o resultado; não o executa.
6. Releases publicadas não entram em coedição: o caminho continua nova publicação (RN-03).
7. Revogar tripulação, convite ou chave — e rebaixar visibilidade ou mover a carta de porto — tira a presença na hora e recusa novos eventos e comandos protegidos daquela sala. O que já foi gravado em atividade e na auditoria permanece.
8. Se o canal cai, a superfície volta à leitura e ao comando normais, com aviso de que a sala está fora. Nada de trabalho fica bloqueado por falta de sala.

Regras: RN-119, RN-120, RN-121, RN-123, RN-124.

Funcionalidades: F-presenca, F-coedicao, F-atividade-viva.

## Editar a quatro mãos, reconectar e resolver conflito

1. Duas presenças com intenção `editando` no mesmo assunto veem o foco uma da outra (bloco, campo ou coluna).
2. Cada mudança sai como operação: `opId` do cliente, `baseVersion` do conteúdo e só a mudança — não o documento inteiro.
3. Se a base estiver defasada, o servidor **recusa** e devolve o estado atual; o cliente recalcula e reenvia. Nunca aplica por cima.
4. Rede instável reenvia com o mesmo `opId`. O servidor aplica uma vez e não emite evento novo — o mesmo vale para comando atômico repetido com a mesma chave.
5. Ao reconectar, o cliente pede o que veio depois do último `seq` que viu. Se a janela já passou, recarrega o snapshot do banco e volta a seguir a sequência.
6. Suspeita de estado divergente resolve-se recarregando o snapshot: Postgres é a verdade, o canal é a réplica ordenada.
7. Se dois participantes escrevem no mesmo bloco, a última operação válida vence **com** registro na atividade — quem perdeu vê o que mudou, não um campo em branco.

Regras: RN-120, RN-124.

Funcionalidades: F-coedicao, F-atividade-viva.

## Auditar chamada MCP

1. Toda chamada autenticada gera um evento de auditoria: quem, qual ferramenta, qual alvo e o resultado. Leitura conta. Recusa conta — inclusive chave sem participação no porto (RN-104).
2. O evento não guarda token, segredo, anexo nem o Markdown integral.
3. A atividade é do artefato; a auditoria é do porto. Não há tela de consulta.
4. Chave legada ligada a uma identidade desativada deixa de autenticar; o histórico permanece (RN-110).

Regras: RN-104, RN-110, RN-122.

Funcionalidades: F-mcp-auditoria.

## Plano de migração progressiva (colaboração ao vivo)

A colaboração ao vivo entra por fases. Cada fase é usável sozinha, mantém Postgres como fonte de verdade (RN-124) e pode voltar atrás desligando o canal — a superfície cai para leitura e comando normais (RN-119).

| Fase | Entrega | Estado ao fim da fase | Volta atrás |
|---|---|---|---|
| 0 — Contrato | Domínio, regras `RN-119`…`RN-124`, capacidades e jornadas escritas | Modelo fechado; nada em runtime | Não se aplica |
| 1 — Sala e presença | Sala por assunto, autorização por porto + entidade + papel, presença com identidade, intenção, estado e foco; revogação encerra presença | `F-presenca` `parcial` (faixa ao vivo + batida HTTP; sem coedição) | Desligar o canal: presença desaparece, nada mais muda |
| 2 — Atividade ao vivo | Eventos de comando atômico anunciados na sala; Cartoteca, editor e tripulação atualizam sem recarregar | `F-atividade-viva` `parcial` | Superfícies voltam a atualizar por navegação |
| 3 — Coedição do conteúdo mutável | Operações com `opId` e `baseVersion` em carta e gabarito | `F-coedicao` `parcial` | Editor volta a salvar o rascunho inteiro pelo caminho atual |
| 4 — Auditoria de MCP | Evento para toda chamada autenticada, sem token nem Markdown integral | `F-mcp-auditoria` existe | Auditoria deixa de registrar chamadas novas |

Ordem obrigatória: autorização antes de presença, presença antes de atividade, atividade antes de coedição. Coedição não abre para um assunto antes de a sala daquele assunto estar autorizada e auditada.

Invariante de cada fase: nenhuma delas move publicação, release ou visibilidade para fora do servidor (RN-120), e nenhuma delas torna o canal fonte de verdade (RN-124).

Fora de todas as fases: CRDT como fonte de verdade; editar release ao vivo; realtime que contorne permissão ou publicação; segredo na auditoria.

## Verificação e telemetria da colaboração ao vivo

Cada fase só fecha com teste automatizado e telemetria no ar. O que precisa estar coberto:

| Risco | Teste automatizado | Telemetria de operação |
|---|---|---|
| Concorrência | Duas operações na mesma `baseVersion`: a segunda é recusada com o estado atual, nunca aplicada por cima; conteúdo final íntegro | Taxa de recusa por base defasada; conflitos por assunto |
| Idempotência | Mesmo `opId` reenviado N vezes aplica uma vez e não emite evento novo; comando atômico repetido com a mesma chave também | Reenvios detectados; duplicatas aplicadas (deve ser zero) |
| Reconexão | Retomada a partir do último `seq`; janela expirada recarrega snapshot e converge ao mesmo conteúdo | Reconexões, lacunas de sequência, tempo até convergir |
| Autorização e revogação | Sem acesso não abre sala; remover da tripulação, revogar convite, revogar chave, desativar identidade, rebaixar visibilidade e mover de porto encerram presença e recusam evento protegido | Presenças encerradas por revogação; eventos protegidos recusados |
| Redaction | Nenhum evento de auditoria, presença ou payload de atividade carrega token, segredo, anexo ou Markdown integral, inclusive em erro | Tamanho de payload, eventos truncados, alertas de campo proibido |
| Recuperação | Canal derrubado no meio da edição: superfície cai para leitura e comando normais, snapshot recarregado sem perda do que foi transacionado | Indisponibilidade do canal, quedas para modo sem sala, recargas de snapshot |
| Custo e volume | Limites de tamanho, frequência e retenção respeitados; escrita e recusa nunca amostradas | Eventos por porto, retenção efetiva, custo por sala |

Regras: RN-119, RN-120, RN-121, RN-122, RN-123, RN-124.

Funcionalidades: F-presenca, F-coedicao, F-atividade-viva, F-mcp-auditoria.
