# Domínio

Vocabulário estável do Portulan. Se um termo mudar de significado, atualize este arquivo e as regras que o usam.

## O que é

Workspace editorial para criar, revisar, publicar e imprimir **documentos técnicos** em Markdown, com a mesma biblioteca operável por pessoas (UI) e por agentes (MCP).

## Atores

| Ator | Quem é |
|---|---|
| Responsável | Dono do documento (`userId`). Único que compartilha, desativa o documento inteiro, duplica e exclui. |
| Editor | Convidado com papel `editor`. Edita rascunho e pode publicar. |
| Leitor | Convidado com papel `viewer`. Lê rascunho e prévia; não edita. |
| Visitante público | Quem abre `/d/{slug}` ou `/p/{id}` sem login. Só vê versão publicada e habilitada de documento com acesso público. |
| Agente | Cliente MCP autenticado com token pessoal do usuário. Opera como aquele usuário. |
| Legado | Documento sem `userId` (pré-autenticação). Tratamento especial de acesso. |

## Entidades

### Documento

Rascunho vivo. Não é o que o público vê.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. Exclusão exige este id. |
| `slug` | UUID fixo na URL estável `/d/{uuid}`. Definido na criação; **não** muda ao renomear o título (RN-08). Slugs legados (título) redirecionam via alias. |
| `title`, `summary` | Título (3–180) e resumo (até 500). |
| `status` | `draft` · `review` · `published` · `archived`. Rótulo editorial; não dispara fluxo sozinho. |
| `templateId` | Paleta, logo e conteúdo-base. |
| `author`, `team`, `tags` | Metadados (até 12 tags, 1–40 chars). |
| `content` | Markdown + diretivas `:::nome` (até 250.000 chars). |
| `version` | Número da última versão **publicada**. Salvar rascunho não incrementa. |
| `disabled` | Se verdadeiro, nenhum link `/d` ou `/p` deste documento mostra conteúdo. |
| `isPublic` | Acesso público do link. Falso na criação: só responsável e convidados. Verdadeiro: qualquer pessoa com o link vê a versão publicada habilitada. |

### Versão publicada (release)

Snapshot **imutável** criado ao publicar. O rascunho pode mudar depois; a release não.

| Campo | Papel |
|---|---|
| `id` | UUID da versão fixa. URL `/p/{id}`. |
| `version` | Inteiro, único por documento. |
| conteúdo + paleta | Cópia do rascunho no instante da publicação. |
| `disabled` | Desliga só este `/p/{id}`. Outras versões e o `/d/{slug}` (se houver versão ativa) continuam. |
| `publishedBy` | Quem publicou. |

### Template

Identidade visual + Markdown inicial.

| Tipo | Quem altera | Pode excluir |
|---|---|---|
| Interno (`Default`) | Ajustes de nome/cores/conteúdo | Não |
| Particular | Só o dono | Sim |

### Compartilhamento

Convite por e-mail, papel `viewer` ou `editor`. Um e-mail por documento.

### Comentário de revisão

Feedback textual no editor, visível a todos com acesso ao documento. Não aparece em leitura pública. Um **fio** é um comentário-raiz e as respostas a ele.

| Campo | Papel |
|---|---|
| `body` | Texto do comentário (até 2.000 caracteres). |
| `quotedText` | Trecho citado da prévia (até 280 caracteres). Só no comentário-raiz. |
| `blockAnchor` | Opcional. Identificador do bloco na prévia no momento do comentário (capa, título `##`/`###`, parágrafo ou componente). Só no comentário-raiz. Sem âncora = documento inteiro. |
| `parentId` | Comentário-raiz do fio. Nulo = raiz. Resposta não aninha em outra resposta. |
| `resolvedAt` | Marca de resolução do fio. Só no comentário-raiz; nulo = aberto. |
| `userId` | Autor autenticado. |

### Conta

Identidade de quem entra no workspace. Uma pessoa, um `id` estável.

| Campo | Papel |
|---|---|
| `id` | UUID interno. Dono de documentos, tokens e convites. |
| Handle | Nome de usuário único (sem maiúsculas na comparação). Serve para entrar com senha. |
| E-mail | Único quando informado. Serve para entrar com senha, convites e mescla com GitHub. |
| Nome | Nome de exibição. |
| Foto | URL do GitHub, se ligado; senão, iniciais do nome ou handle. |
| Métodos | `github` e/ou `senha`. Pelo menos um. |

Não há verificação de e-mail nem recuperação por mensagem. Quem esqueceu a senha só recupera se a conta já tiver GitHub (RN-84).

### Tema

Preferência visual **local** do navegador (RN-85). Não é campo da conta e não sincroniza entre aparelhos.

| Papel | Tinta de ação | Acento |
|---|---|---|
| Carta | Chart Ink (navy) | Seal Wax |
| Pergaminho | Umber | Ferrugem |
| Névoa | Grafite | Chart Indigo |
| Costa | Sounding Teal Ink | Chart Ink |
| Lacre | Seal Wax | Chart Ink |

Cada papel tem modo claro e escuro. **Personalizado** é a sexta opção: a pessoa escolhe qualquer cor no seletor; essa tinta vira a ação do chrome naquele modo. A marca de três barras permanece Carta.

### Token MCP

Credencial pessoal (`ptl_…`). Expira em 30d, 60d, 1 ano ou nunca. Autentica o agente como o usuário.

### Componente Markdown

Bloco do catálogo (alerta, gráfico, checklist, …). A modal **Adicionar componente** e o MCP leem o mesmo catálogo. Novo bloco = uma entrada no catálogo, não uma lista paralela no editor.

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{uuid}` | Sempre a última versão publicada **habilitada**. UUID fixo na criação. Com acesso público, qualquer pessoa com o link vê; sem acesso público, só responsável e convidados autenticados. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. Mesma regra de acesso que `/d`. |
| `/documents/{id\|uuid}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |

## Workspace autenticado

Chrome com trilho de ícones (tooltips no desktop). Não vale para leitura pública nem para o editor (RN-70).

| URL | Significado |
|---|---|
| `/` | Dashboard: resumo da biblioteca, documentos recentes, atalhos. |
| `/biblioteca` | Lista completa, busca (título, resumo, tags e corpo), filtro por origem (meus / compartilhados), filtro por status e filtro por template. |
| `/templates` | Templates editoriais do usuário. |
| `/integrations` | Rumos de conexão MCP (endpoint, token, skill), catálogo agrupado de ferramentas e tokens pessoais. |

## Componentes living

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Na leitura interativa o visitante pode marcar no **próprio navegador** (localStorage). Isso **não** altera o Markdown nem sincroniza entre aparelhos. Sem permissão de edição, a prévia declara que as marcações valem só naquele navegador.
