# Backlog ICE — Portulan

Fonte: leva 2, 11 set. 2026; pedidos avulsos depois disso. Score = (I × C × E) / 10.

Atualize este arquivo quando o ranking mudar. Não reexplore o repo inteiro para recriar esta tabela.

## Ranking atual

Pedido avulso (14 set. 2026), fora da leva 2.

| # | ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|---|
| — | auth-password | Cadastro com senha, mescla GitHub e modal da conta | Conta | 8 | 9 | 5 | 36.0 | entregue |
| — | portos | Portos (workspaces) com tripulação, convite por link, visibilidade em três níveis, tema do porto e léxico náutico | Workspace | 9 | 9 | 4 | 32.4 | entregue |
| — | dev-context | Contexto de desenvolvimento: Expedições, Rumos versionados, Manobras com lease, Agentes de Bordo, MCP e CLI `portulan init` | Expedição / MCP | 9 | 8 | 2 | 14.4 | entregue (correção 15 set. 2026) |

## Escopo (dev-context)

- Expedição no porto, Embarcação lógica (N:N com papel e paths relativos), sem path absoluto no servidor.
- Rumo com ciclo `draft/review/approved/superseded`, validade à parte, revisão imutável na aprovação.
- Cartas-fonte com release imutável; nova edição da carta sinaliza `needs_review` sem invalidar o Rumo antigo.
- Plano opcional e Manobras com lease atômico, relatório e aceite humano. Sem Kanban, prazo, pontos ou alocação.
- Conversas de bordo (domínio separado dos comentários de carta) e Diário de bordo.
- Agente de Bordo com modos `context_and_coordination`, `local_implementation` e `review`; chave ligada a humano + identidade + porto.
- MCP: bootstrap, contexto, brief, claim/renew/release, relatórios e coordenação. Chaves MCP unificadas em Instrumentos (identidade + validade + ferramentas); catálogo completo de 49 ferramentas.
- CLI `portulan init` / `doctor`: config sem segredo, `AGENT.md`, blocos gerenciados idempotentes.

Fora: Kanban/sprints/prazos/alocação; execução de código no servidor; sync contínuo de Git; validação automática de PR; aprovação por IA; grafo visual; CRDT; e-mail; gravar token, segredo ou path absoluto no repositório.

## Escopo (auth-password)

- Cadastro com handle, e-mail, nome e senha; login aceita handle ou e-mail.
- Mescla: mesma conta com GitHub e/ou senha; ligar no modal ou no login GitHub com e-mail de conta sem GitHub.
- Clique na foto abre modal (dados, métodos, tema, Instrumentos, sair).

Fora: verificação de e-mail, “esqueci a senha”, upload de avatar, segundo provedor OAuth.

## Escopo (portos)

- Porto inicial automático por conta; criar outros portos; porto ativo na sessão; seletor no topo do trilho.
- Tripulação com capitão / imediato / tripulante (RN-88); convite por link com papel, validade e limite de usos (RN-89); sair, transferir capitania e excluir porto vazio (RN-90, RN-91).
- Visibilidade da carta em três níveis — camarote, porto, mar aberto (RN-17, RN-18) — e mover carta entre portos (RN-19). Selo de colaborador externo (RN-93).
- Gabaritos e tokens MCP presos ao porto (RN-92, RN-55); `list_workspaces` no MCP.
- Tema do porto aplicado no servidor, com sobrescrita local por navegador (RN-94).
- Léxico náutico na UI: carta, cartoteca, gabarito, instrumentos, porto, tripulação, cartógrafo, frota, ponte.

Fora: e-mail de convite, cobrança/plano por porto, domínio verificado, papéis por carta herdados do porto, tema por pessoa no servidor.

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
| E-mail de convite | Exige provedor; o convite de porto por link e o convite nominal por e-mail já cobrem a entrada. |
| Colaboração simultânea / CRDT | Custo alto demais para o desenho atual. |
| PDF anônimo em `/d` e `/p` | Puppeteer em rota pública: custo e abuso. Quem tem acesso baixa a versão no Histórico. |
| Menções @ e notificação de comentário | Precisa de canal novo; o fio no editor já é o lugar da conversa. |

## Já existe (não listar de novo)

Editor Markdown + prévia, catálogo de diretivas `:::`, gabaritos com paleta/logo, duplicar gabarito na UI, publicar com `/d/{slug}` e `/p/{id}`, visibilidade em três níveis (camarote / porto / mar aberto), compartilhar leitor/editor com selo de externo, MCP (cartas/gabaritos/componentes/shares/upload/portos/contexto de desenvolvimento), CLI `portulan init`, Expedições e Rumos versionados com Manobras e Agentes de Bordo, PDF do rascunho, PDF de versão publicada no Histórico, download do Markdown fonte (`.md`), duplicar carta na UI e no MCP, desativar carta/versão, upload de imagem (Blob), checklist living em localStorage, card `:::report`, diagramas Mermaid (` ```mermaid `), workspace autenticado com trilho (Ponte, Cartoteca, Gabaritos, Expedições, Embarcações, Rumos, Instrumentos, Porto) e seletor de porto, portos com tripulação e convite por link, tema do porto no servidor com sobrescrita local, mover carta entre portos, salvar rascunho (botão ou Cmd/Ctrl+S), slug UUID estável, filtro de status, busca no corpo, atalhos B/I/K, Tab/Shift+Tab para indentar, índice com âncoras, diff de versões, restaurar release no rascunho, comentários na prévia com respostas, login GitHub ou handle/e-mail + senha, cadastro com senha, mescla de métodos na mesma conta, modal da conta.

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
| 8 | template-duplicate-ui | Duplicar gabarito na tela Gabaritos | Gabaritos | 4 | 10 | 9 | 36.0 | entregue |

### Entregue fora do ranking da leva 1

| ID | Melhoria | Superfície | I | C | E | Score | Estado |
|---|---|---|---|---|---|---|---|
| workspace-nav | Dashboard, telas separadas e sidebar | Workspace | 7 | 10 | 7 | 49.0 | entregue |
| mermaid | Diagramas Mermaid na prévia, público e PDF | Leitura | 8 | 8 | 6 | 38.4 | entregue |
| restore-release | Restaurar versão publicada no rascunho | Publicação | 8 | 9 | 8 | 57.6 | entregue |
| visibilidade | Carta nasce em camarote; cartógrafo escolhe o nível | Publicação | 9 | 10 | 8 | 72.0 | entregue |
