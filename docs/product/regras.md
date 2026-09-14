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
- **RN-88** Papéis do porto: capitão (`owner`, um por porto), imediato (`admin`) e tripulante (`member`). Capitão e imediato convidam, removem, mudam papéis e alteram nome e tema. Ninguém muda o próprio papel. Imediato não altera nem remove outro imediato. O capitão não é removido nem rebaixado por troca de papel — a capitania só muda por transferência, e só o capitão transfere.
- **RN-89** Convite de porto é **link** (`/convite/{token}`), papel `admin` ou `member`, com validade (1d, 7d, 30d ou nunca) e limite de usos opcional (1–500). O token aparece uma única vez. Resgatar exige login e recusa convite revogado, expirado, esgotado ou de porto em que a pessoa já é tripulante. Capitania não se convida.
- **RN-90** Deixar o porto: tripulante e imediato saem; capitão precisa transferir a capitania antes. Ninguém fica sem porto — sair do último porto é recusado, e o porto inicial não pode ser deixado.
- **RN-91** Só o capitão exclui o porto, e só depois de o porto ficar **sem cartas**: mover ou excluir as cartas vem antes. Porto inicial não é excluído.
- **RN-92** Gabaritos e tokens MCP pertencem ao porto onde foram criados. Toda a tripulação usa os gabaritos do porto; alteram e excluem o autor, o capitão e o imediato. Gabaritos internos seguem RN-30. Gabaritos particulares legados (sem porto) continuam só do dono.
- **RN-93** Convidado nominal que não faz parte da tripulação do porto da carta é sinalizado como **externo** na UI de compartilhamento. Externo tem exatamente o papel do convite (leitor ou editor) — nada mais.

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

- **RN-50** Toda chamada MCP exige `Authorization: Bearer` com token pessoal válido.
- **RN-51** O agente opera com a identidade e as permissões daquele usuário — não há bypass de dono.
- **RN-52** Preferir `update_document` em carta existente; não duplicar o assunto com `create_document`. Para clonar uma carta inteira, usar duplicar na UI ou `duplicate_document` no MCP.
- **RN-53** Upload via MCP (`upload_image`, `upload_file`) usa o mesmo Blob, limites (RN-45) e prefixo por usuário/carta da UI; exige token MCP válido e permissão de edição na carta de destino.
- **RN-54** Ao substituir o Markdown do rascunho (MCP `update_document`, `publish_document` com `content`, ou qualquer API que envie `content` completo), o servidor **preserva o estado living já salvo** no rascunho atual: para cada `:::testcase` com o mesmo `id`, mantém o `status` do rascunho (ignora o `status` do payload); para cada item de `:::checklist` com o mesmo título (primeira coluna, comparação normalizada), mantém `[x]`/`[ ]` do rascunho. Itens novos no payload usam o estado do agente; itens removidos do payload somem. O rascunho prevalece sobre o incoming — agentes não resetam marcações do usuário via replace de conteúdo.
- **RN-55** O token MCP está preso ao porto ativo no momento em que foi gerado. Cartas e gabaritos criados pelo agente nascem nesse porto; `list_documents` enxerga o mesmo recorte que a cartoteca daquele porto (mais as cartas compartilhadas nominalmente). `list_workspaces` diz quais portos a pessoa tem e qual deles o token opera. Trocar de porto na UI **não** move o token: para operar em outro porto, gerar um token novo nele.

## Publicação

- **RN-63** Diff de versões compara snapshots publicados e o rascunho atual (metadados + Markdown). Não altera conteúdo; só leitura na aba Histórico do editor.

## PDF

- **RN-64** O PDF exportado mantém os links do relatório clicáveis: Markdown, índice (`##`/`###`), cards de outro relatório e URLs. Âncoras internas saltam na mesma versão; o restante abre no navegador.
- **RN-71** PDF do rascunho (menu **Exportar PDF** do editor) usa o conteúdo atual do rascunho. PDF de versão publicada (aba **Histórico**) usa o snapshot imutável da release escolhida, com metadados e paleta daquela versão. Ambos exigem autenticação e acesso à carta. Não há exportação PDF anônima em `/d` ou `/p`.

## Editor

- **RN-62** Com alterações no rascunho ainda não persistidas, fechar ou sair da aba do editor exibe aviso do navegador (`beforeunload`). Após o salvamento manual concluir, o aviso deixa de aparecer.

## Chrome do workspace

- **RN-70** A navegação do workspace aparece só em Ponte, Cartoteca, Gabaritos, Instrumentos e Porto. No desktop é um trilho de ícones com tooltips, com o seletor de porto no topo. Não aparece na leitura pública (`/d`, `/p`), na prévia do rascunho, na exportação PDF nem no editor.

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
- **RN-94** O tema é do **porto** e viaja com a conta: o servidor pinta a tela com o papel do porto ativo, então o mesmo porto abre igual em qualquer aparelho. Capitão e imediato definem o papel do porto; qualquer pessoa pode guardar um papel próprio naquele navegador, por porto, e voltar ao papel do porto quando quiser. A sobrescrita local nunca muda o que a tripulação vê. Tela de acesso e leitura pública, que não têm porto, usam a preferência local do navegador.
