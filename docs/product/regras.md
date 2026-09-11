# Regras de negócio

Invariantes. Se o código divergir, o código está errado — ou esta regra precisa ser atualizada na mesma sessão da mudança.

Formato: **pode / não pode / acontece**. Sem caminho de arquivo.

## Documento e rascunho

- **RN-01** Salvar o rascunho não cria versão publicada e não incrementa `version`. Cmd/Ctrl+S e o botão **Salvar** seguem a mesma regra.
- **RN-02** Publicar só é permitido se o rascunho difere da última release (título, resumo, template/paleta/logo, autor, time, tags ou conteúdo). Sem diferença, recusar.
- **RN-03** Publicar cria um snapshot imutável, avança `version` e passa o status editorial para publicado.
- **RN-04** Links `/p/{id}` já emitidos não mudam de conteúdo quando o rascunho é editado ou republicado.
- **RN-05** `/d/{uuid}` aponta sempre para a release habilitada mais recente daquele documento.
- **RN-06** Excluir documento é irreversível e exige o UUID (`id`), não o slug.
- **RN-07** Título 3–180, resumo ≤ 500, autor/time ≤ 100, até 12 tags (1–40), conteúdo ≤ 250.000.
- **RN-08** O slug público (`/d/{uuid}`) é um UUID definido na criação do documento. Renomear o título **não** altera o slug. Dois documentos podem ter o mesmo título. Slugs legados derivados do título continuam resolvendo via tabela de aliases até expirarem.
- **RN-09** Restaurar uma release no rascunho copia título, resumo, template, autor, time, tags e conteúdo daquela versão para o rascunho. Não altera releases existentes, não incrementa `version` e não publica automaticamente. Responsável e editor convidado podem restaurar. O estado living já salvo no rascunho prevalece sobre o snapshot (RN-54).

## Acesso

- **RN-10** Só o responsável compartilha, altera papel, revoga, liga ou desliga o acesso público, desativa o documento inteiro, duplica e exclui.
- **RN-11** Editor convidado edita o rascunho e pode publicar (criar versão). Leitor não edita. Publicar não torna o documento visível a visitantes.
- **RN-12** Não compartilhar com o responsável (mesmo e-mail ou mesma conta).
- **RN-13** Não duplicar convite para o mesmo e-mail no mesmo documento. Papel igual ao atual não é alteração.
- **RN-14** Documento sem responsável (legado) permanece acessível para leitura/edição no modo legado; os links `/d` e `/p` continuam legíveis sem login.
- **RN-15** Visitante sem login nunca vê rascunho. Só vê release habilitada de documento não desativado **e** com acesso público ligado.
- **RN-16** Todo documento nasce privado (`isPublic` falso). Criar, duplicar ou publicar uma versão **não** abre o link a visitantes.
- **RN-17** Com acesso público desligado, `/d` e `/p` só abrem para o responsável e para quem foi convidado (leitor ou editor), autenticados. Com acesso público ligado, qualquer pessoa com o link vê a release habilitada (RN-15), salvo documento ou versão desativados.

## Publicação desligada

- **RN-20** Documento `disabled`: todos os `/d/` e `/p/` daquele documento mostram indisponibilidade.
- **RN-21** Release `disabled`: só aquele `/p/{id}` some. Se ainda existir release habilitada, `/d/{slug}` continua na mais recente habilitada.
- **RN-22** Sem nenhuma release habilitada, `/d/{slug}` é indisponível mesmo com o documento ativo.

## Templates

- **RN-30** Template interno não pode ser excluído.
- **RN-31** Template particular só é alterado ou excluído pelo dono.
- **RN-32** Mudar o template de um documento já criado altera paleta/logo da prévia do rascunho; não reescreve releases antigas.

## Markdown e componentes

- **RN-40** `:::checklist` é só para tarefas rastreáveis (`- [ ]` / `- [x]`). Critérios, sintomas e listas informativas usam bullets Markdown.
- **RN-41** Novo bloco de relatório entra no catálogo único. Não há segunda lista de categorias no editor.
- **RN-42** Card `:::report` aponta para o link estável `/d/{uuid}` de um documento **publicado**. `:::report` e `:::image` são diretivas void (uma linha, só atributos): corpo acidental ou `:::` de fechamento é descartado na renderização e não deve ser escrito pelo autor.
- **RN-43** Checklist e testcase com estado durável: quando o leitor autenticado pode editar o documento, toggles reescrevem o Markdown fonte (`- [ ]`/`[x]` ou `status` do testcase) via salvamento debounced no rascunho **e**, em leitura pública editável (`/d/` ou `/p/` com permissão), também na release exibida — para o estado sobreviver ao refresh da mesma URL. Sem permissão de edição, checklist pode usar cache local do navegador; testcase permanece somente leitura.
- **RN-44** `:::testcase` exige `id` único no documento. Status permitidos: `pending`, `ok`, `partial`, `error`. Preferir testcase a tabelas largas para cenários de QA.
- **RN-45** Upload de anexo de relatório (`:::file`) aceita qualquer tipo de arquivo até 5 MB; imagens em `:::figure` continuam restritas a PNG, JPG, WEBP, SVG e GIF. Logo de template permanece só imagem.
- **RN-46** `:::file` exige `url` e `name` (nome original com extensão). O card renderizado mostra a extensão em destaque e link para abrir/baixar o arquivo.
- **RN-47** Em blocos de linhas com colunas (`:::properties`, `:::kv` e similares), a coluna **valor** aceita Markdown inline (links, negrito, código) com a mesma política de segurança do restante do relatório; URLs cruas continuam virando link automático quando aplicável.
- **RN-48** Blocos de código com linguagem `mermaid` renderizam diagrama SVG na prévia, leitura pública e PDF, usando a paleta do template (flowchart, sequência e estado). Se o autor já incluir `%%{init:…}%%`, o init customizado prevalece.
- **RN-49** Títulos `##` e `###` recebem âncoras estáveis derivadas do texto (acentos removidos, minúsculas, hífens); títulos repetidos recebem sufixo numérico. Um índice navegável na capa lista essas seções na prévia do editor, na prévia de rascunho, nas vistas públicas `/d` e `/p` e na exportação PDF.

## MCP

- **RN-50** Toda chamada MCP exige `Authorization: Bearer` com token pessoal válido.
- **RN-51** O agente opera com a identidade e as permissões daquele usuário — não há bypass de dono.
- **RN-52** Preferir `update_document` em documento existente; não duplicar o assunto com `create_document`. Para clonar um documento inteiro, usar duplicar na UI ou `duplicate_document` no MCP.
- **RN-53** Upload via MCP (`upload_image`, `upload_file`) usa o mesmo Blob, limites (RN-45) e prefixo por usuário/documento da UI; exige token MCP válido e permissão de edição no documento de destino.
- **RN-54** Ao substituir o Markdown do rascunho (MCP `update_document`, `publish_document` com `content`, ou qualquer API que envie `content` completo), o servidor **preserva o estado living já salvo** no rascunho atual: para cada `:::testcase` com o mesmo `id`, mantém o `status` do rascunho (ignora o `status` do payload); para cada item de `:::checklist` com o mesmo título (primeira coluna, comparação normalizada), mantém `[x]`/`[ ]` do rascunho. Itens novos no payload usam o estado do agente; itens removidos do payload somem. O rascunho prevalece sobre o incoming — agentes não resetam marcações do usuário via replace de conteúdo.

## Publicação

- **RN-63** Diff de versões compara snapshots publicados e o rascunho atual (metadados + Markdown). Não altera conteúdo; só leitura na aba Histórico do editor.

## PDF

- **RN-64** O PDF exportado mantém os links do relatório clicáveis: Markdown, índice (`##`/`###`), cards de outro relatório e URLs. Âncoras internas saltam na mesma versão; o restante abre no navegador.
- **RN-71** PDF do rascunho (menu **Exportar PDF** do editor) usa o conteúdo atual do rascunho. PDF de versão publicada (aba **Histórico**) usa o snapshot imutável da release escolhida, com metadados e paleta daquela versão. Ambos exigem autenticação e acesso ao documento. Não há exportação PDF anônima em `/d` ou `/p`.

## Editor

- **RN-62** Com alterações no rascunho ainda não persistidas, fechar ou sair da aba do editor exibe aviso do navegador (`beforeunload`). Após o salvamento manual concluir, o aviso deixa de aparecer.

## Chrome do workspace

- **RN-70** A navegação do workspace aparece só em Dashboard, Biblioteca, Templates e Integrações. No desktop é um trilho de ícones com tooltips. Não aparece na leitura pública (`/d`, `/p`), na prévia do rascunho, na exportação PDF nem no editor.

## Revisão

- **RN-60** Status `review` é rótulo editorial; não dispara fila de aprovação automática.
- **RN-61** Comentários de revisão só no editor autenticado, para quem já tem acesso ao documento (responsável, editor ou leitor). Sem comentário anônimo em `/d` ou `/p`. O comentário-raiz pode ancorar a qualquer bloco visível na prévia do rascunho (capa, título `##`/`###`, parágrafo ou componente) e pode citar um trecho; sem âncora vale para o documento inteiro. Vários fios podem ancorar o mesmo bloco, cada um com o próprio trecho; o marcador do bloco abre todos. A âncora e o trecho são do instante do comentário: se o rascunho mudar, o fio continua visível.
- **RN-65** Resposta só a um comentário-raiz do mesmo documento. Um nível: resposta não tem respostas aninhadas. A resposta herda âncora e trecho do raiz. Remover o raiz remove o fio. Cada autor remove o próprio comentário (raiz ou resposta).
- **RN-66** Estado resolvido pertence ao comentário-raiz do fio. Quem tem acesso ao documento (responsável, editor ou leitor) pode resolver e reabrir. Fio resolvido permanece visível na prévia e na aba Revisão; some só se o autor remover o raiz. A aba Revisão filtra abertos, resolvidos ou todos. Sem e-mail ou notificação.

## Conta e autenticação

- **RN-80** Handle e e-mail (quando houver) são únicos, comparação sem maiúsculas. Cadastro com senha exige handle, e-mail, nome e senha de pelo menos 8 caracteres. Sem e-mail de confirmação.
- **RN-81** Entrar com senha aceita handle **ou** e-mail, mais a senha. GitHub permanece no mesmo ecrã de acesso.
- **RN-82** Uma conta tem GitHub, senha, ou os dois. Não pode desligar o último método. Cadastro com senha **não** mescla em silêncio: e-mail ou handle já usados recusam e pedem para entrar.
- **RN-83** Mescla na mesma conta: (1) quem já entrou define ou troca a senha, ou conecta o GitHub, no modal da conta; (2) login GitHub cujo e-mail já existe em conta **sem** GitHub anexa o GitHub a essa conta. GitHub já ligado a outra conta recusa.
- **RN-84** Clique na foto de perfil abre o modal da conta (não um menu só com Sair). O modal mostra nome, handle, e-mail e foto, métodos de entrada, o seletor de tema (cinco papéis, claro/escuro e personalizado), atalho para Integrações e Sair. Sem recuperação por e-mail: quem esqueceu a senha só recupera se a conta já tiver GitHub.
- **RN-85** Tema é preferência local deste navegador, não da conta. Há cinco papéis (Carta, Pergaminho, Névoa, Costa, Lacre), cada um com modo claro e escuro e tinta de ação própria, mais **Personalizado**: ao escolher, a pessoa abre o seletor e define a cor livremente; essa tinta vira a ação do chrome naquele modo. Workspace, tela de acesso e leitura pública compartilham essa preferência. Valor legado claro/escuro vira Carta no mesmo modo. A marca de três barras e as tintas de tipo de documento não mudam com o tema. PDF e impressão permanecem papel branco Carta.
