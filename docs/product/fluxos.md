# Fluxos

Caminhos que o produto promete. Se a jornada mudar, atualize aqui e as `RN-xx` envolvidas.

## Entrar e criar conta

1. Na tela de acesso, a pessoa entra com GitHub **ou** com handle/e-mail e senha.
2. Para criar conta com senha: informa nome, handle, e-mail, senha e confirmação. Handle ou e-mail já usados recusam; o sistema pede para entrar (não mescla).
3. Primeiro login GitHub cria a conta. Se o e-mail do GitHub já existir em conta **sem** GitHub, o GitHub é anexado a essa conta.
4. Depois de entrar, o clique na foto abre o modal da conta: dados, métodos (definir/trocar senha, conectar ou desligar GitHub), seletor de tema (papel, claro/escuro ou personalizado com cor livre), atalho para Integrações e Sair. Não dá para desligar o último método.
5. Não há e-mail de confirmação nem “esqueci a senha”. Recuperação só se a conta já tiver GitHub: entrar pelo GitHub e redefinir a senha no modal.

Regras: RN-80 a RN-85.

## Criar documento

1. Pessoa escolhe um template (ou o Default).
2. Informa título (obrigatório) e resumo opcional.
3. O sistema cria um rascunho (`draft`) associado ao usuário, **privado**, com slug UUID fixo (igual ao `id`) e conteúdo-base do template. O título pode ser alterado depois sem mudar o link `/d/{uuid}`. Visitantes não veem o documento até o responsável ligar o acesso público.

Agente: `list_documents` (evitar duplicata de assunto) → `create_document`.

Regras: RN-07, RN-52.

## Editar e salvar

1. Da Biblioteca (ou do dashboard, pelos recentes), a pessoa abre o documento.
2. Responsável ou editor altera título, resumo, Markdown, metadados ou template.
3. O rascunho é gravado por Cmd/Ctrl+S ou pelo botão **Salvar**. Não publica. Não gera `/p` novo. Com alterações ainda não gravadas, sair da aba pode exibir aviso do navegador.
4. Prévia ao lado reflete o rascunho no mesmo papel de leitura da vista pública (folha web, índice quando há `##`/`###`); “Abrir prévia” abre o rascunho autenticado em outra aba. A impressão/PDF continua A4 e os links do relatório permanecem clicáveis.
5. Atalhos no textarea: Cmd/Ctrl+B (negrito), I (itálico), K (link), Cmd/Ctrl+Shift+C (modal **Adicionar componente**), Tab / Shift+Tab (indentar linha ou bloco selecionado).
6. Colar imagem (PNG, JPG, WEBP ou GIF) no textarea envia pelo Blob e insere `:::figure` no cursor, com os mesmos limites de RN-45. Arquivos genéricos continuam na modal **Adicionar componente** → **Arquivo** (`:::file`).
7. Anexos: na modal **Adicionar componente**, escolher **Arquivo**, enviar o arquivo (qualquer tipo, até 5 MB) e inserir `:::file{url name title?}`. Imagens também podem ser enviadas em **Imagem** (`:::figure`).
8. Voltar no editor retorna à Biblioteca.
9. No menu de ações, **Baixar Markdown** grava o rascunho se houver alterações pendentes e baixa o conteúdo como `{slug}.md`.

Regras: RN-01, RN-08, RN-11, RN-45, RN-46, RN-62, RN-49, RN-64.

## Duplicar template

1. Na tela Templates, a pessoa aciona **Duplicar** em qualquer template acessível (Default interno ou particular).
2. O sistema cria um template particular com nome `Cópia de {nome original}`, copiando paleta, logo e conteúdo-base.
3. O clone aparece na grade; a pessoa pode editá-lo como qualquer template particular.

Funcionalidade: F-duplicar-template-ui.

Regras: RN-31.

## Filtrar biblioteca

1. No dashboard, os cards de resumo levam à Biblioteca já filtrada por status (todos, publicado, revisão, rascunho ou arquivado).
2. Na Biblioteca, a pessoa combina filtro de origem (todos, meus ou compartilhados comigo), filtro de status, filtro de template e busca local em título, resumo e tags.
3. Cada linha exibe selo **Meu** ou **Compartilhado** conforme o responsável do documento.

Funcionalidade: F-filtro-status, F-filtro-origem, F-stats.

## Publicar

1. Só se o rascunho difere da última release (RN-02).
2. Snapshot imutável + `version` + 1.
3. Devolve `/d/{uuid}` (sempre a última habilitada) e `/p/{releaseId}` (esta versão).
4. O documento **continua privado**: o link só abre para responsável e convidados, até o responsável ligar o acesso público.
5. Edições seguintes no rascunho não alteram `/p` antigos.

Regras: RN-02, RN-03, RN-04, RN-05, RN-16.

## Tornar público ou privado

1. Só o responsável liga ou desliga o acesso público. O cadeado ao lado de Publicar abre o diálogo; também em Compartilhar ou Metadados.
2. Público: qualquer pessoa com `/d` ou `/p` vê a versão publicada habilitada.
3. Privado de novo: visitantes perdem o acesso; responsável e convidados continuam.

Regras: RN-10, RN-15, RN-17.

## Restaurar versão no rascunho

1. Na aba Histórico do editor, responsável ou editor escolhe uma versão publicada e confirma “Restaurar no rascunho”.
2. O sistema copia título, resumo, template, autor, time, tags e conteúdo daquela release para o rascunho.
3. Releases já publicadas permanecem intactas; `version` do documento não avança.
4. Para registrar o rascunho restaurado como nova versão, a pessoa usa Publicar (se houver diferença em relação à última release).

Regras: RN-01, RN-04, RN-09, RN-11, RN-54.

## Baixar PDF de versão publicada

1. Na aba **Histórico** do editor, quem tem acesso ao documento abre **Mais** na versão desejada e escolhe **Baixar PDF**.
2. O sistema gera A4 com cabeçalho/rodapé e links clicáveis a partir do snapshot imutável daquela release (metadados e paleta da versão), não do rascunho atual.
3. O menu **Exportar PDF** do editor continua no rascunho. Não há PDF anônimo em `/d` ou `/p`.

Regras: RN-64, RN-71.

## Compartilhar

1. Só o responsável convida por e-mail (`viewer` ou `editor`).
2. Recusar: responsável, e-mail já convidado, papel idêntico ao atual.
3. Editor passa a editar; leitor só lê. Avatares no editor.
4. Convidados autenticados acessam o editor e, se houver versão publicada, também `/d` e `/p` mesmo com o documento privado.

Regras: RN-10 a RN-13, RN-17.

## Revisar com comentários

1. Responsável, editor ou leitor abre o documento no editor.
2. Na prévia, seleciona um trecho ou aciona o marcador de um bloco para abrir os fios daquele bloco (cada trecho citado é um fio); ou escreve um comentário geral na aba **Revisão**.
3. Quem tem acesso responde no mesmo fio. Autor remove o próprio comentário; remover o raiz encerra o fio.
4. Links públicos (`/d`, `/p`) não exibem nem aceitam comentários.

Regras: RN-60, RN-61, RN-65.

## Leitura pública

1. Visitante abre `/d/{uuid}` ou `/p/{id}`.
2. Se o documento está privado: sem login, pedir autenticação; logado sem convite, negar acesso. Responsável e convidados veem o snapshot publicado.
3. Se o documento está desativado, ou a release está desativada (e no `/d` não há outra habilitada), ver indisponibilidade — não o rascunho.
4. Com acesso público, o conteúdo é o snapshot publicado, com paleta daquela versão.
5. Se o relatório tem títulos `##` ou `###`, a capa exibe um índice navegável; cada título recebe âncora para saltar à seção. O mesmo índice aparece na prévia do editor.

Regras: RN-15, RN-16, RN-17, RN-20 a RN-22, RN-48, RN-49.

Funcionalidade: F-indice.

## Comparar versões

1. Na aba **Histórico** do editor, escolher comparar o rascunho com a última release (quando há alterações pendentes), duas releases, ou uma release específica com o rascunho ou outra release.
2. O modal mostra metadados (título, resumo, template, autor, time, tags) e linhas do Markdown adicionadas/removidas, com legenda visual (− removido / + adicionado) e contagem de alterações.
3. Responsável ou editor convidado pode restaurar uma release no rascunho direto do modal (com confirmação), quando pelo menos um dos lados é uma versão publicada.

Regras: RN-01, RN-02, RN-09, RN-63.

## Desativar

- Documento inteiro: todos os links públicos saem do ar; reativação restaura conforme versões ativas.
- Uma versão: só aquele `/p/{id}`.

Regras: RN-10, RN-20, RN-21.

## Agente (MCP)

1. Usuário abre Integrações e copia endpoint + header (ou snippet de config).
2. Gera token pessoal, copia na hora (exibido uma vez) e revoga com confirmação se necessário.
3. Cliente envia o Bearer em toda chamada.
4. O agente lista/lê/edita/publica como aquele usuário, no mesmo recorte de permissão da UI.
5. Para restaurar uma versão publicada no rascunho: `list_document_releases` → `restore_document` (RN-09); releases existentes permanecem; publicar depois se quiser registrar o rascunho restaurado.
6. Para imagens ou anexos: `upload_image` / `upload_file` (base64 + filename + content_type + document_id) → URL pública → `update_document` com `:::figure` ou `:::file`.
7. Para revisão com comentários: `list_document_comments` → `create_document_comment` (raiz ou `parent_id` para responder) → `delete_document_comment` para remover o próprio. Mesmo recorte da UI; sem comentário em `/d` ou `/p`.

Regras: RN-09, RN-45, RN-46, RN-50, RN-51, RN-52, RN-53, RN-54, RN-61, RN-65.

## Excluir

Responsável confirma. Remove o documento e as releases. Irreversível. Agente precisa do UUID.

Regra: RN-06.
