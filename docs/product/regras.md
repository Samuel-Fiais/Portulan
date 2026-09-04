# Regras de negócio

Invariantes. Se o código divergir, o código está errado — ou esta regra precisa ser atualizada na mesma sessão da mudança.

Formato: **pode / não pode / acontece**. Sem caminho de arquivo.

## Documento e rascunho

- **RN-01** Salvar o rascunho não cria versão publicada e não incrementa `version`.
- **RN-02** Publicar só é permitido se o rascunho difere da última release (título, resumo, template/paleta/logo, autor, time, tags ou conteúdo). Sem diferença, recusar.
- **RN-03** Publicar cria um snapshot imutável, avança `version` e passa o status editorial para publicado.
- **RN-04** Links `/p/{id}` já emitidos não mudam de conteúdo quando o rascunho é editado ou republicado.
- **RN-05** `/d/{slug}` aponta sempre para a release habilitada mais recente daquele documento.
- **RN-06** Excluir documento é irreversível e exige o UUID (`id`), não o slug.
- **RN-07** Título 3–180, resumo ≤ 500, autor/time ≤ 100, até 12 tags (1–40), conteúdo ≤ 250.000.
- **RN-08** (comportamento atual, candidato a mudança ICE `stable-slug`) Alterar o título **regenera** o slug. Isso pode quebrar `/d/{slug}` e cards `:::report`.

## Acesso

- **RN-10** Só o responsável compartilha, altera papel, revoga, desativa o documento inteiro, duplica e exclui.
- **RN-11** Editor convidado edita o rascunho e pode publicar. Leitor não edita.
- **RN-12** Não compartilhar com o responsável (mesmo e-mail ou mesma conta).
- **RN-13** Não duplicar convite para o mesmo e-mail no mesmo documento. Papel igual ao atual não é alteração.
- **RN-14** Documento sem responsável (legado) permanece acessível para leitura/edição no modo legado.
- **RN-15** Visitante público nunca vê rascunho. Só release habilitada de documento não desativado.

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
- **RN-42** Card `:::report` aponta para o link estável `/d/{slug}` de um documento **publicado**.
- **RN-43** Checklist e testcase com estado durável: quando o leitor autenticado pode editar o documento, toggles reescrevem o Markdown fonte (`- [ ]`/`[x]` ou `status` do testcase) via salvamento debounced. Sem permissão de edição, checklist pode usar cache local do navegador; testcase permanece somente leitura.
- **RN-44** `:::testcase` exige `id` único no documento. Status permitidos: `pending`, `ok`, `partial`, `error`. Preferir testcase a tabelas largas para cenários de QA.

## MCP

- **RN-50** Toda chamada MCP exige `Authorization: Bearer` com token pessoal válido.
- **RN-51** O agente opera com a identidade e as permissões daquele usuário — não há bypass de dono.
- **RN-52** Preferir `update_document` em documento existente; não duplicar o assunto com `create_document`.

## Revisão (hoje vs. planejado)

- **RN-60** (hoje) Status `review` é rótulo. Não há comentários nem fila de aprovação.
- **RN-61** (planejado, ICE `review-comments`) Comentários só para quem já tem acesso ao documento. Sem comentário anônimo em `/p`.
