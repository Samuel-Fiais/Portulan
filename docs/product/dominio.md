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
| Visitante público | Quem abre `/d/{slug}` ou `/p/{id}` sem login. Só vê versão publicada e habilitada. |
| Agente | Cliente MCP autenticado com token pessoal do usuário. Opera como aquele usuário. |
| Legado | Documento sem `userId` (pré-autenticação). Tratamento especial de acesso. |

## Entidades

### Documento

Rascunho vivo. Não é o que o público vê.

| Campo | Papel |
|---|---|
| `id` | UUID. Identidade estável. Exclusão exige este id. |
| `slug` | Identificador na URL estável `/d/{slug}`. Hoje é regenerado se o título muda (ver RN-08). |
| `title`, `summary` | Título (3–180) e resumo (até 500). |
| `status` | `draft` · `review` · `published` · `archived`. Rótulo editorial; não dispara fluxo sozinho. |
| `templateId` | Paleta, logo e conteúdo-base. |
| `author`, `team`, `tags` | Metadados (até 12 tags, 1–40 chars). |
| `content` | Markdown + diretivas `:::nome` (até 250.000 chars). |
| `version` | Número da última versão **publicada**. Salvar rascunho não incrementa. |
| `disabled` | Se verdadeiro, nenhum link público deste documento mostra conteúdo. |

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

### Token MCP

Credencial pessoal (`ptl_…`). Expira em 30d, 60d, 1 ano ou nunca. Autentica o agente como o usuário.

### Componente Markdown

Bloco do catálogo (alerta, gráfico, checklist, …). A modal **Adicionar componente** e o MCP leem o mesmo catálogo. Novo bloco = uma entrada no catálogo, não uma lista paralela no editor.

## Identificadores públicos

| URL | Significado |
|---|---|
| `/d/{slug}` | Sempre a última versão publicada **habilitada**. |
| `/p/{releaseId}` | Aquela versão, para sempre, até ser desativada. |
| `/documents/{id\|slug}` | Editor autenticado. |
| `/documents/{id}/preview` | Prévia do rascunho (quem tem acesso). |

## Componentes living

### Checklist

Itens `- [ ]` / `- [x]` dentro de `:::checklist`. Quando o leitor pode editar o documento, o estado persiste no Markdown fonte. Sem permissão de edição, o navegador pode manter cache local (localStorage) — o Markdown no servidor prevalece quando editável.

### Testcase

Bloco `:::testcase` com atributos `id` (obrigatório, único), `status` (`pending` | `ok` | `partial` | `error`), `priority` (`low` | `medium` | `high`) e `title`. Corpo em Markdown livre (pré-condição, passos, resultado esperado). Status persiste no atributo do opener quando editável.
