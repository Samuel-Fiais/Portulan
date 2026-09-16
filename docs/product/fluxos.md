# Fluxos

Caminhos que o produto promete. Se a jornada mudar, atualize aqui e as `RN-xx` envolvidas.

## Entrar e criar conta

1. Na tela de acesso, a pessoa entra com GitHub **ou** com handle/e-mail e senha.
2. Para criar conta com senha: informa nome, handle, e-mail, senha e confirmação. Handle ou e-mail já usados recusam; o sistema pede para entrar (não mescla).
3. Primeiro login GitHub cria a conta. Se o e-mail do GitHub já existir em conta **sem** GitHub, o GitHub é anexado a essa conta.
4. Na primeira entrada, a conta ganha o **porto inicial** (`Porto de {nome}`) e já navega nele (RN-86).
5. Depois de entrar, o clique na foto abre o modal da conta: dados, métodos (definir/trocar senha, conectar ou desligar GitHub), seletor de tema (papel, claro/escuro ou personalizado com cor livre), atalho para Instrumentos e Sair. Não dá para desligar o último método.
6. Não há e-mail de confirmação nem “esqueci a senha”. Recuperação só se a conta já tiver GitHub: entrar pelo GitHub e redefinir a senha no modal.

Regras: RN-80 a RN-86.

## Percorrer o trilho

1. Depois de entrar, a pessoa cai na Ponte do porto ativo.
2. O trilho (compacto, expandido e drawer estreito) lista os destinos nesta ordem: Ponte → Cartoteca → Gabaritos → Expedições → Embarcações → Rumos → Instrumentos → Porto. Cartoteca e Gabaritos são itens próprios; não há menu Acervo (RN-70).
3. Trabalho editorial: da Ponte ou da Cartoteca abre a carta; carta nova começa por um gabarito.
4. Trabalho de desenvolvimento: cria a Expedição, registra e vincula Embarcações, depois abre ou cria Rumos (na Expedição ou a partir de uma Carta).
5. Instrumentos liga agentes e tokens; Porto cuida da identidade e da tripulação.

Regra: RN-70.

## Criar e trocar de porto

1. No topo do trilho, o seletor mostra o porto ativo. Clicar lista os outros portos da pessoa.
2. Escolher outro porto grava a preferência na sessão e recarrega a Cartoteca, a Ponte e os Gabaritos naquele acervo (RN-87).
3. **Novo porto** pede só o nome. Quem cria entra como capitão, e o porto novo já vira o ativo.
4. **Abrir o porto** leva a `/workspace`: identidade (nome do porto e papel pessoal), tripulação, convites e zona de risco.

Regras: RN-86, RN-87, RN-88, RN-107.

## Convidar e organizar a tripulação

1. Em `/workspace`, capitão ou imediato gera um convite escolhendo papel (imediato ou tripulante), validade (1 dia, 7 dias, 30 dias ou nunca) e limite de usos opcional.
2. O link `/invite/{token}` é copiado na hora — o token não aparece de novo. Convites ativos ficam listados e podem ser revogados.
3. Quem recebe abre o link, entra (ou cria conta) e confirma. Convite revogado, expirado, esgotado ou de porto onde já é tripulante é recusado com o motivo.
4. Na lista de tripulação, capitão e imediato promovem ou rebaixam entre imediato e tripulante e removem pessoas. Ninguém mexe no próprio papel; imediato não mexe em outro imediato.
5. O capitão transfere a capitania para alguém da tripulação; ele passa a imediato e a outra pessoa assume o comando.

Regras: RN-88, RN-89, RN-107.

## Escolher o papel (tema)

1. No trilho **Tema**, em `/workspace` (**Seu papel**) ou no modal da conta, a pessoa escolhe um dos cinco papéis (claro/escuro) ou **Personalizado**.
2. A escolha pinta a tela **na hora** e fica gravada neste navegador — por porto quando há porto ativo, ou global na tela de acesso e leitura pública.
3. Cada tripulante pode ter um papel diferente no mesmo porto; ninguém impõe tema para os outros.

Regras: RN-85, RN-94.

## Deixar ou afundar um porto

1. Tripulante e imediato usam **Deixar o porto**. O capitão precisa transferir a capitania antes; o porto inicial e o último porto da pessoa não podem ser deixados.
2. Só o capitão exclui um porto, e só quando ele está **sem cartas, Expedições, Embarcações e Rumos**: mover esse acervo para outro porto ou excluí-lo vem primeiro. O porto inicial não é excluído.
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
2. Cartógrafo ou editor altera título, resumo, Markdown, metadados ou gabarito.
3. O rascunho é gravado por Cmd/Ctrl+S ou pelo botão **Salvar**. Não publica. Não gera `/p` novo. Com alterações ainda não gravadas, sair da aba pode exibir aviso do navegador.
4. Prévia ao lado reflete o rascunho no mesmo papel de leitura da vista pública (folha web, índice quando há `##`/`###`); “Abrir prévia” abre o rascunho autenticado em outra aba. A impressão/PDF continua A4 e os links do relatório permanecem clicáveis.
5. Atalhos no textarea: Cmd/Ctrl+B (negrito), I (itálico), K (link), Cmd/Ctrl+Shift+C (modal **Adicionar componente**), Tab / Shift+Tab (indentar linha ou bloco selecionado).
6. Colar imagem (PNG, JPG, WEBP ou GIF) no textarea envia pelo Blob e insere `:::figure` no cursor, com os mesmos limites de RN-45. Arquivos genéricos continuam na modal **Adicionar componente** → **Arquivo** (`:::file`).
7. Anexos: na modal **Adicionar componente**, escolher **Arquivo**, enviar o arquivo (qualquer tipo, até 5 MB) e inserir `:::file{url name title?}`. Imagens também podem ser enviadas em **Imagem** (`:::figure`).
8. Voltar no editor retorna à Cartoteca.
9. No menu de ações, **Baixar Markdown** grava o rascunho se houver alterações pendentes e baixa o conteúdo como `{slug}.md`.

Regras: RN-01, RN-08, RN-11, RN-45, RN-46, RN-62, RN-49, RN-64.

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

1. Usuário abre Instrumentos, confere em que porto está e copia endpoint + header (ou snippet de config).
2. Cria chave MCP: nome do agente, validade e ferramentas (todas habilitadas por padrão, RN-111). A chave é exibida uma vez e copiada na hora; revogação com confirmação quando necessário. A chave fica presa ao porto ativo daquele momento (RN-55); para operar em outro porto, trocar de porto e gerar outra chave.
3. Cliente envia o Bearer em toda chamada.
4. O agente lista/lê/edita/publica como aquele usuário, no recorte do porto do token — o mesmo recorte de permissão da UI. `list_workspaces` mostra os portos e qual deles o token opera.
5. Para restaurar uma versão publicada no rascunho: `list_document_releases` → `restore_document` (RN-09); releases existentes permanecem; publicar depois se quiser registrar o rascunho restaurado.
6. Para imagens ou anexos: `upload_image` / `upload_file` (base64 + filename + content_type + document_id) → URL pública → `update_document` com `:::figure` ou `:::file`.
7. Para revisão com comentários: `list_document_comments` → `create_document_comment` (raiz ou `parent_id` para responder) → `delete_document_comment` para remover o próprio. Mesmo recorte da UI; sem comentário em `/d` ou `/p`.

Regras: RN-09, RN-45, RN-46, RN-50 a RN-55, RN-61, RN-65.

## Excluir

Cartógrafo confirma. Remove a carta e as releases. Irreversível. Agente precisa do UUID.

Regra: RN-06.

## Criar Expedição e vincular Embarcações

1. Na tela Expedições, a tripulação cria uma Expedição no porto ativo (nome e objetivo). Agente MCP pode criar via MCP (`create_project`).
2. Registra Embarcações na tela Embarcações (ou a partir da Expedição) — Git, local ou ambos — e vincula com papel e paths relativos. Agente MCP pode registrar via MCP (`create_repository`, com vínculo opcional à Expedição).
3. Path absoluto de checkout não é gravado no servidor; o CLI informa o checkout na máquina.

Regras: RN-96, RN-97, RN-98.

## Transformar Carta em Rumo

1. Na carta, **Iniciar um Rumo a partir desta Carta** (ou criar Rumo avulso na Expedição). Agente MCP cria rascunho via MCP (`propose_context_pack`).
2. O Rumo nasce `draft`. Fontes formais pedem uma edição publicada imutável; o formulário mostra as edições e exige uma. Publicar carta privada continua privado.
3. Itens (decisão, regra, contrato, risco, suposição, pergunta), escopo, não-escopo, Marcos de chegada e, se quiser, Plano de navegação com Manobras. Enquanto o Rumo é rascunho ou está em revisão, dá para trocar ou remover fonte, item e Marco.
4. Enviar para revisão. Responsável do Rumo, capitão ou imediato aprova — confirmação explícita. Nasce revisão imutável. A tela mostra Carta viva, edição fixada e o snapshot `/p`.
5. Se a Carta-fonte ganhar edição nova, o Rumo anterior permanece; a validade passa a `needs_review`. Recuperar o contrato é **Criar nova revisão**: copia o conteúdo para rascunho, preserva o histórico e deixa as Manobras na revisão que as sustentou.

Regras: RN-99, RN-100, RN-101, RN-102.

Funcionalidades: F-rumo, F-rumo-aprovar, F-carta-usada-em-contextos.

## Assumir Manobra e reportar

1. Agente autenticado chama `get_agent_bootstrap`: identidade, modo, Embarcação da sessão (só se existir no porto), Manobras compatíveis e protocolo. Sem participação no porto, a chave é recusada.
2. Sem Rumo aprovado e válido, o MCP devolve diagnóstico — não um briefing meio pronto. Listar ou assumir Manobra também exige esse recorte.
3. **Assumir o comando** cria lease atômico. Renovar exige atividade. Expirado pode ser retomado. Progresso e resultado só pelo detentor do lease ativo.
4. Conversa de bordo fica no fio do Rumo, da Manobra, do item ou do Marco — separados dos comentários da carta. Ao abrir o fio, o bordo escolhe o tipo **Conversa** ou **Maré contrária** (RN-109). Agentes leem o corpo das mensagens. Várias Marés só liberam a Manobra quando a última for resolvida.
5. O Registro de bordo descreve o resultado com evidências, lacunas e cobertura dos Marcos. Reportado não é aceito sozinho: o revisor vê esses campos antes de aceitar. Resumo em branco não registra; mensagem em branco não envia o fio.
6. Manobra de código só com Embarcação do porto compatível com a Manobra. Ausência não é reconhecida automaticamente. Agente não aprova Rumo nem aceita resultado.

Regras: RN-101, RN-103, RN-104, RN-105, RN-108, RN-109, RN-110, RN-111.

Funcionalidades: F-manobra, F-conversa-bordo, F-mcp-dev-context, F-agente-bordo.

## Auto-configuração do agente (ponta a ponta)

1. Tripulante ou agente gera **chave MCP** em Instrumentos (passo 02) no porto correto, conectando ao Portulan na cloud (`https://portulan.vercel.app`).
2. Configura o cliente MCP (`.cursor/mcp.json` com Bearer `ptl_…`).
3. Exporta `PORTULAN_TOKEN` / `PORTULAN_ENDPOINT` para o terminal — nunca no repositório (RN-106).
4. Na raiz do checkout de código: `portulan init` registra ou reusa Embarcação, vincula Expedição(ões), escreve `.portulan/config.json` e `.portulan/AGENT.md`, e acrescenta blocos gerenciados.
5. `portulan doctor` confirma token, vínculo e blocos.
6. Primeira chamada MCP de dev-context: `get_agent_bootstrap` com `repository_id` do config.

A skill **portulan-mcp** e o **Guia do Agente** (copiado em Instrumentos) documentam este roteiro para auto-configuração sem instruções humanas adicionais.

Regras: RN-50, RN-55, RN-106, RN-111.

Funcionalidades: F-mcp-token, F-cli-init, F-agente-bordo.
