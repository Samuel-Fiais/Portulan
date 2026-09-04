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
3. Salvar grava o rascunho. Não publica. Não gera `/p` novo.
4. Prévia ao lado reflete o rascunho; “Abrir prévia” abre o rascunho autenticado em outra aba.
5. Anexos: na modal **Adicionar componente**, escolher **Arquivo**, enviar o arquivo (qualquer tipo, até 5 MB) e inserir `:::file{url name title?}`. Imagens continuam em **Imagem** (`:::figure`).
6. Voltar no editor retorna à Biblioteca.

Regras: RN-01, RN-08, RN-11, RN-45, RN-46.

## Publicar

1. Só se o rascunho difere da última release (RN-02).
2. Snapshot imutável + `version` + 1.
3. Devolve `/d/{uuid}` (sempre a última habilitada) e `/p/{releaseId}` (esta versão).
4. Edições seguintes no rascunho não alteram `/p` antigos.

Regras: RN-02, RN-03, RN-04, RN-05.

## Compartilhar

1. Só o responsável convida por e-mail (`viewer` ou `editor`).
2. Recusar: responsável, e-mail já convidado, papel idêntico ao atual.
3. Editor passa a editar; leitor só lê. Avatares no editor.

Regras: RN-10 a RN-13.

## Leitura pública

1. Visitante abre `/d/{uuid}` ou `/p/{id}`.
2. Se o documento está desativado, ou a release está desativada (e no `/d` não há outra habilitada), ver indisponibilidade — não o rascunho.
3. Conteúdo é o snapshot publicado, com paleta daquela versão.

Regras: RN-15, RN-20 a RN-22.

## Desativar

- Documento inteiro: todos os links públicos saem do ar; reativação restaura conforme versões ativas.
- Uma versão: só aquele `/p/{id}`.

Regras: RN-10, RN-20, RN-21.

## Agente (MCP)

1. Usuário gera token no dashboard (Integrações).
2. Cliente envia o Bearer em toda chamada.
3. O agente lista/lê/edita/publica como aquele usuário, no mesmo recorte de permissão da UI.
4. Para imagens ou anexos: `upload_image` / `upload_file` (base64 + filename + content_type + document_id) → URL pública → `update_document` com `:::figure` ou `:::file`.

Regras: RN-45, RN-46, RN-50, RN-51, RN-52, RN-53.

## Excluir

Responsável confirma. Remove o documento e as releases. Irreversível. Agente precisa do UUID.

Regra: RN-06.
