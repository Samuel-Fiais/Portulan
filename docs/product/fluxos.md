# Fluxos

Caminhos que o produto promete. Se a jornada mudar, atualize aqui e as `RN-xx` envolvidas.

## Criar documento

1. Pessoa escolhe um template (ou o Default).
2. Informa título (obrigatório) e resumo opcional.
3. O sistema cria um rascunho (`draft`) associado ao usuário, com slug UUID fixo (igual ao `id`) e conteúdo-base do template. O título pode ser alterado depois sem mudar o link `/d/{uuid}`.

Agente: `list_documents` (evitar duplicata de assunto) → `create_document`.

Regras: RN-07, RN-52.

## Editar e salvar

1. Da Biblioteca (ou do dashboard, pelos recentes), a pessoa abre o documento.
2. Responsável ou editor altera título, resumo, Markdown, metadados ou template.
3. O rascunho é gravado automaticamente após pausa na edição (debounce), por Cmd/Ctrl+S ou pelo botão Salvar. Não publica. Não gera `/p` novo. Com alterações ainda não gravadas, sair da aba pode exibir aviso do navegador.
4. Prévia ao lado reflete o rascunho no mesmo papel de leitura da vista pública (folha web, índice quando há `##`/`###`); “Abrir prévia” abre o rascunho autenticado em outra aba. A impressão/PDF continua A4.
5. Atalhos no textarea: Cmd/Ctrl+B (negrito), I (itálico), K (link) e Cmd/Ctrl+Shift+C (modal **Adicionar componente**).
6. Anexos: na modal **Adicionar componente**, escolher **Arquivo**, enviar o arquivo (qualquer tipo, até 5 MB) e inserir `:::file{url name title?}`. Imagens continuam em **Imagem** (`:::figure`).
7. Voltar no editor retorna à Biblioteca.
8. No menu de ações, **Baixar Markdown** grava o rascunho se houver alterações pendentes e baixa o conteúdo como `{slug}.md`.

Regras: RN-01, RN-08, RN-11, RN-45, RN-46, RN-62, RN-49.

## Filtrar biblioteca

1. No dashboard, os cards de resumo levam à Biblioteca já filtrada por status (todos, publicado, revisão, rascunho ou arquivado).
2. Na Biblioteca, a pessoa combina filtro de status, filtro de template e busca local em título, resumo e tags.

Funcionalidade: F-filtro-status, F-stats.

## Publicar

1. Só se o rascunho difere da última release (RN-02).
2. Snapshot imutável + `version` + 1.
3. Devolve `/d/{uuid}` (sempre a última habilitada) e `/p/{releaseId}` (esta versão).
4. Edições seguintes no rascunho não alteram `/p` antigos.

Regras: RN-02, RN-03, RN-04, RN-05.

## Restaurar versão no rascunho

1. Na aba Histórico do editor, responsável ou editor escolhe uma versão publicada e confirma “Restaurar no rascunho”.
2. O sistema copia título, resumo, template, autor, time, tags e conteúdo daquela release para o rascunho.
3. Releases já publicadas permanecem intactas; `version` do documento não avança.
4. Para registrar o rascunho restaurado como nova versão, a pessoa usa Publicar (se houver diferença em relação à última release).

Regras: RN-01, RN-04, RN-09, RN-11, RN-54.

## Compartilhar

1. Só o responsável convida por e-mail (`viewer` ou `editor`).
2. Recusar: responsável, e-mail já convidado, papel idêntico ao atual.
3. Editor passa a editar; leitor só lê. Avatares no editor.

Regras: RN-10 a RN-13.

## Revisar com comentários

1. Responsável, editor ou leitor abre o documento no editor.
2. Na aba **Revisão**, escreve comentário e pode opcionalmente vincular a uma seção `##` do rascunho.
3. Todos com acesso ao documento veem a conversa; cada autor pode remover o próprio comentário.
4. Links públicos (`/d`, `/p`) não exibem nem aceitam comentários.

Regras: RN-60, RN-61.

## Leitura pública

1. Visitante abre `/d/{uuid}` ou `/p/{id}`.
2. Se o documento está desativado, ou a release está desativada (e no `/d` não há outra habilitada), ver indisponibilidade — não o rascunho.
3. Conteúdo é o snapshot publicado, com paleta daquela versão.
4. Se o relatório tem títulos `##` ou `###`, a capa exibe um índice navegável; cada título recebe âncora para saltar à seção. O mesmo índice aparece na prévia do editor.

Regras: RN-15, RN-20 a RN-22, RN-48, RN-49.

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

1. Usuário gera token no dashboard (Integrações).
2. Cliente envia o Bearer em toda chamada.
3. O agente lista/lê/edita/publica como aquele usuário, no mesmo recorte de permissão da UI.
4. Para imagens ou anexos: `upload_image` / `upload_file` (base64 + filename + content_type + document_id) → URL pública → `update_document` com `:::figure` ou `:::file`.

Regras: RN-45, RN-46, RN-50, RN-51, RN-52, RN-53, RN-54.

## Excluir

Responsável confirma. Remove o documento e as releases. Irreversível. Agente precisa do UUID.

Regra: RN-06.
