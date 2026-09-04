# Regras de negócio

Invariantes. Se o código divergir, o código está errado — ou esta regra precisa ser atualizada na mesma sessão da mudança.

Formato: **pode / não pode / acontece**. Sem caminho de arquivo.

## Documento e rascunho

- **RN-01** Salvar o rascunho não cria versão publicada e não incrementa `version`.
- **RN-02** Publicar só é permitido se o rascunho difere da última release (título, resumo, template/paleta/logo, autor, time, tags ou conteúdo). Sem diferença, recusar.
- **RN-03** Publicar cria um snapshot imutável, avança `version` e passa o status editorial para publicado.
- **RN-04** Links `/p/{id}` já emitidos não mudam de conteúdo quando o rascunho é editado ou republicado.
- **RN-05** `/d/{uuid}` aponta sempre para a release habilitada mais recente daquele documento.
- **RN-06** Excluir documento é irreversível e exige o UUID (`id`), não o slug.
- **RN-07** Título 3–180, resumo ≤ 500, autor/time ≤ 100, até 12 tags (1–40), conteúdo ≤ 250.000.
- **RN-08** O slug público (`/d/{uuid}`) é um UUID definido na criação do documento. Renomear o título **não** altera o slug. Dois documentos podem ter o mesmo título. Slugs legados derivados do título continuam resolvendo via tabela de aliases até expirarem.

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
- **RN-42** Card `:::report` aponta para o link estável `/d/{uuid}` de um documento **publicado**. `:::report` e `:::image` são diretivas void (uma linha, só atributos): corpo acidental ou `:::` de fechamento é descartado na renderização e não deve ser escrito pelo autor.
- **RN-43** Checklist e testcase com estado durável: quando o leitor autenticado pode editar o documento, toggles reescrevem o Markdown fonte (`- [ ]`/`[x]` ou `status` do testcase) via salvamento debounced no rascunho **e**, em leitura pública editável (`/d/` ou `/p/` com permissão), também na release exibida — para o estado sobreviver ao refresh da mesma URL. Sem permissão de edição, checklist pode usar cache local do navegador; testcase permanece somente leitura.
- **RN-44** `:::testcase` exige `id` único no documento. Status permitidos: `pending`, `ok`, `partial`, `error`. Preferir testcase a tabelas largas para cenários de QA.
- **RN-45** Upload de anexo de relatório (`:::file`) aceita qualquer tipo de arquivo até 5 MB; imagens em `:::figure` continuam restritas a PNG, JPG, WEBP, SVG e GIF. Logo de template permanece só imagem.
- **RN-46** `:::file` exige `url` e `name` (nome original com extensão). O card renderizado mostra a extensão em destaque e link para abrir/baixar o arquivo.
- **RN-47** Em blocos de linhas com colunas (`:::properties`, `:::kv` e similares), a coluna **valor** aceita Markdown inline (links, negrito, código) com a mesma política de segurança do restante do relatório; URLs cruas continuam virando link automático quando aplicável.

## MCP

- **RN-50** Toda chamada MCP exige `Authorization: Bearer` com token pessoal válido.
- **RN-51** O agente opera com a identidade e as permissões daquele usuário — não há bypass de dono.
- **RN-52** Preferir `update_document` em documento existente; não duplicar o assunto com `create_document`.
- **RN-53** Upload via MCP (`upload_image`, `upload_file`) usa o mesmo Blob, limites (RN-45) e prefixo por usuário/documento da UI; exige token MCP válido e permissão de edição no documento de destino.
- **RN-54** Ao substituir o Markdown do rascunho (MCP `update_document`, `publish_document` com `content`, ou qualquer API que envie `content` completo), o servidor **preserva o estado living já salvo** no rascunho atual: para cada `:::testcase` com o mesmo `id`, mantém o `status` do rascunho (ignora o `status` do payload); para cada item de `:::checklist` com o mesmo título (primeira coluna, comparação normalizada), mantém `[x]`/`[ ]` do rascunho. Itens novos no payload usam o estado do agente; itens removidos do payload somem. O rascunho prevalece sobre o incoming — agentes não resetam marcações do usuário via replace de conteúdo.

## Chrome do workspace

- **RN-70** A navegação do workspace aparece só em Dashboard, Biblioteca, Templates e Integrações. No desktop é um trilho de ícones com tooltips. Não aparece na leitura pública (`/d`, `/p`), na prévia do rascunho, na exportação PDF nem no editor.

## Revisão (hoje vs. planejado)

- **RN-60** (hoje) Status `review` é rótulo. Não há comentários nem fila de aprovação.
- **RN-61** (planejado, ICE `review-comments`) Comentários só para quem já tem acesso ao documento. Sem comentário anônimo em `/p`.
