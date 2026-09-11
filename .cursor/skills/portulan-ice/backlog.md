# Backlog ICE — Portulan

Fonte: leva 2, 11 set. 2026. Score = (I × C × E) / 10.

Atualize este arquivo quando o ranking mudar. Não reexplore o repo inteiro para recriar esta tabela.

## Ranking atual

Pedido avulso (11 set. 2026), fora da leva 2.

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| — | auth-password | Cadastro com senha, mescla GitHub e modal da conta | Conta | 8 | 9 | 5 | 36.0 | entregue |

## Escopo (auth-password)

- Cadastro com handle, e-mail, nome e senha; login aceita handle ou e-mail.
- Mescla: mesma conta com GitHub e/ou senha; ligar no modal ou no login GitHub com e-mail de conta sem GitHub.
- Clique na foto abre modal (dados, métodos, tema, Integrações, sair).

Fora: verificação de e-mail, “esqueci a senha”, upload de avatar, segundo provedor OAuth, tema no servidor.

## Escopo (leva 2)

- **mcp-comments** — Ferramentas MCP no mesmo recorte da UI (RN-61, RN-65): listar fios, criar raiz (âncora opcional), responder, remover o próprio. Sem comentário em `/d` ou `/p`.
- **library-ownership** — Select meus / compartilhados comigo / todos; selo na linha. `userId` já vem na listagem. MCP já devolve `userId`; não precisa de ferramenta nova.
- **mcp-restore** — `restore_document` com o mesmo contrato da UI (RN-09): copia a release para o rascunho, não publica, não apaga versões.
- **editor-tab** — Tab indenta a linha ou o bloco selecionado; Shift+Tab desindenta. Não sai do textarea.
- **paste-image** — Colar PNG/JPG/WEBP/GIF da área de transferência no textarea envia pelo Blob já existente e insere `:::figure` no cursor. Mesmos limites de RN-45. Sem colar arquivo genérico (continua na modal).
- **comment-resolve** — Estado resolvido no fio (raiz). Quem tem acesso resolve e reabre. Lista da aba Revisão filtra abertos / resolvidos / todos. Resolvido não some; some só se o autor remover. Sem e-mail.
- **pdf-release** — No Histórico, baixar PDF daquela release (snapshot imutável), não do rascunho atual. A ação **Exportar PDF** do editor continua no rascunho. Sem PDF anônimo em `/d` ou `/p`.
- **template-duplicate-ui** — Botão Duplicar na tela Templates; mesmo comportamento do MCP `duplicate_template` (particular, paleta + conteúdo-base).

## Fora de propósito

| Item | Por quê |
|---|---|
| Checklist living no servidor | `:::checklist` já existe; estado só em localStorage. Não pedido nesta leva. |
| E-mail de convite | Exige provedor; não desbloqueia revisão. |
| Colaboração simultânea / CRDT | Custo alto demais para o desenho atual. |
| PDF anônimo em `/d` e `/p` | Puppeteer em rota pública: custo e abuso. Quem tem acesso baixa a versão no Histórico. |
| Menções @ e notificação de comentário | Precisa de canal novo; o fio no editor já é o lugar da conversa. |

## Já existe (não listar de novo)

Editor Markdown + prévia, catálogo de diretivas `:::`, templates com paleta/logo, duplicar template na UI, publicar com `/d/{slug}` e `/p/{id}`, documento privado por padrão com opção de acesso público, compartilhar leitor/editor, MCP (docs/templates/componentes/shares/upload), PDF do rascunho, PDF de versão publicada no Histórico, download do Markdown fonte (`.md`), duplicar documento na UI e no MCP, desativar documento/versão, upload de imagem (Blob), checklist living em localStorage, card `:::report`, diagramas Mermaid (` ```mermaid `), workspace autenticado com sidebar (Dashboard, Biblioteca, Templates, Integrações), salvar rascunho (botão ou Cmd/Ctrl+S), slug UUID estável, filtro de status, busca no corpo, atalhos B/I/K, Tab/Shift+Tab para indentar, índice com âncoras, diff de versões, restaurar release no rascunho, comentários na prévia com respostas, login GitHub ou handle/e-mail + senha, cadastro com senha, mescla de métodos na mesma conta, modal da conta.

## Leva 1 — entregue (4 set. 2026)

Não re-pontuar. Mantido só como memória.

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | autosave | Autosave, Cmd/Ctrl+S e aviso ao sair | Editor | 9 | 9 | 8 | 64.8 | entregue |
| 2 | stable-slug | Slug UUID estável; título renomeável | Publicação | 9 | 10 | 7 | 63.0 | entregue |
| 3 | status-filter | Filtro por status na biblioteca | Biblioteca | 6 | 10 | 10 | 60.0 | entregue |
| 4 | export-md | Download do Markdown fonte | Editor | 6 | 10 | 10 | 60.0 | entregue |
| 6 | toc-anchors | Índice navegável com âncoras | Leitura | 9 | 9 | 7 | 56.7 | entregue |
| 7 | mcp-duplicate | `duplicate_document` no MCP | MCP | 6 | 9 | 9 | 48.6 | entregue |
| 8 | content-search | Busca no corpo do documento | Biblioteca | 8 | 8 | 7 | 44.8 | entregue |
| 9 | md-shortcuts | Atalhos de formatação no editor | Editor | 7 | 8 | 8 | 44.8 | entregue |
| 11 | version-diff | Diff entre versões | Publicação | 8 | 8 | 6 | 38.4 | entregue |
| 12 | review-comments | Comentários de revisão | Colaboração | 8 | 8 | 5 | 32.0 | entregue |
| 13 | preview-comment-threads | Comentários na prévia com respostas | Colaboração | 8 | 9 | 6 | 43.2 | entregue |

## Leva 2 — entregue (11 set. 2026)

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | mcp-comments | Listar, criar, responder e remover comentários no MCP | MCP | 7 | 10 | 8 | 56.0 | entregue |
| 2 | library-ownership | Filtro e selo meus vs compartilhados | Biblioteca | 6 | 10 | 9 | 54.0 | entregue |
| 3 | mcp-restore | `restore_document` no MCP | MCP | 5 | 10 | 9 | 45.0 | entregue |
| 4 | editor-tab | Tab / Shift+Tab para indentar no Markdown | Editor | 5 | 10 | 9 | 45.0 | entregue |
| 5 | paste-image | Colar imagem no editor → `:::figure` | Editor | 7 | 9 | 7 | 44.1 | entregue |
| 6 | comment-resolve | Resolver e reabrir fios de revisão | Colaboração | 7 | 10 | 6 | 42.0 | entregue |
| 7 | pdf-release | PDF de uma versão publicada (Histórico) | Publicação | 7 | 10 | 6 | 42.0 | entregue |
| 8 | template-duplicate-ui | Duplicar template na tela Templates | Templates | 4 | 10 | 9 | 36.0 | entregue |

### Entregue fora do ranking da leva 1

| ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|
| workspace-nav | Dashboard, telas separadas e sidebar | Workspace | 7 | 10 | 7 | 49.0 | entregue |
| mermaid | Diagramas Mermaid na prévia, público e PDF | Leitura | 8 | 8 | 6 | 38.4 | entregue |
| restore-release | Restaurar versão publicada no rascunho | Publicação | 8 | 9 | 8 | 57.6 | entregue |
| visibilidade | Documento nasce privado; responsável liga acesso público | Publicação | 9 | 10 | 8 | 72.0 | entregue |
