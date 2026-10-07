# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** pessoas em times técnicos (produto, engenharia, operações, documentação) que precisam **criar, revisar, publicar e compartilhar** relatórios e documentos técnicos em Markdown — com prévia fiel, PDF e links públicos estáveis.

**Secondary:** **agentes** (via MCP com token pessoal) que operam a mesma cartoteca do usuário autenticado, no porto do token — listar, ler, criar, editar, duplicar, publicar e gerenciar documentos sem UI paralela.

**Situação típica:** elaborar um relatório de incidente, referência técnica, roadmap ou documentação interna; iterar em rascunho com colegas; publicar snapshot imutável para leitores externos ou stakeholders; reutilizar templates e componentes Markdown padronizados.

## Product Purpose

O Portulan é um **workspace editorial** para documentos técnicos, organizado em **portos** (workspaces) com tripulação própria: rascunho vivo, revisão colaborativa, publicação com versões imutáveis e leitura pública/ impressão. Sucesso significa que autor e agente conseguem ir do zero ao link `/d/{uuid}` ou `/p/{id}` com consistência visual (template), componentes ricos e regras de negócio previsíveis.

## Positioning

Paridade **humano + agente** na mesma biblioteca (UI e MCP), com **releases imutáveis** e **slug UUID estável** — vizinhos podem ter editor Markdown ou publicação, mas não combinam catálogo de diretivas `:::`, histórico de versões com diff/restauração, comentários de revisão no editor e operação MCP documentada na mesma superfície.

## Operating Context

- **Workspace autenticado:** Ponte (dashboard), Cartoteca (busca no corpo, filtro por status/gabarito), Gabaritos e a tela do Porto (tripulação, tema, convites). O seletor de porto aparece no trilho quando a pessoa tem mais de um porto. Chaves MCP ficam no modal da conta.
- **Editor:** título, resumo, Markdown, metadados, prévia lado a lado, salvar rascunho (botão ou Cmd/Ctrl+S), atalhos, export PDF/Markdown, componentes do catálogo.
- **Publicação:** snapshot imutável por release; links `/d/{uuid}` (última ativa) e `/p/{id}` (versão fixa); histórico com comparar, restaurar e desativar.
- **Leitura pública:** `/d` e `/p` sem login; TOC com âncoras; Mermaid; blocos living (checklist local no navegador).
- **Colaboração:** porto com tripulação (capitão / imediato / tripulante) e convite por link; convite nominal por e-mail (leitor/editor) com selo de externo; visibilidade da carta em três níveis (camarote / porto / mar aberto); comentários de revisão só no editor autenticado.
- **Autenticação:** GitHub ou handle/e-mail e senha (Auth.js).
- **Persistência:** Postgres (Neon) via Drizzle; Blob (Vercel) para imagens e anexos.

Modelo de negócio detalhado (entidades, regras `RN-xx`, funcionalidades `F-…`, fluxos): `docs/product/`.

## Capabilities and Constraints

**Confirmado (existe):**

- CRUD de documentos e gabaritos; portos com tripulação e convite por link; visibilidade em três níveis; compartilhar; publicar/desativar; duplicar (UI e MCP).
- Catálogo de componentes Markdown (`:::alert`, gráficos, checklist, etc.) compartilhado entre modal do editor e MCP.
- Busca na cartoteca e MCP incluindo corpo do documento, sempre no recorte do porto ativo.
- Salvar rascunho sob demanda, atalhos Markdown, diff de versões, restaurar release, comentários de revisão.
- PDF A4, export `.md`, tokens MCP pessoais.

**Limites de produto (não negociáveis sem mudança de modelo):**

- Checklist living persiste só no navegador do leitor (localStorage), não no servidor.
- Status editorial (`draft` / `review` / `published` / `archived`) é rótulo; não dispara workflow automático.
- Comentários de revisão não aparecem em `/p` nem `/d`.
- Conteúdo ≤ 250.000 caracteres; até 12 tags; título 3–180 caracteres.

**Terminologia:** a UI usa o léxico náutico — carta (documento), cartoteca (biblioteca), gabarito (template), instrumentos (integrações), porto (workspace), tripulação, cartógrafo (responsável), frota (time), ponte (dashboard), camarote / porto / mar aberto (visibilidade). O código mantém os nomes técnicos; o mapa completo está em `docs/product/dominio.md`.

## Brand Commitments

- **Nome:** Portulan.
- **Voz:** português do Brasil; tom técnico, direto, sem marketing vazio; labels de produto em mono onde a UI já estabelece isso.
- **Identidade:** login GitHub ou handle/senha; tema por porto (mesmo papel em qualquer aparelho, com sobrescrita local); marca e logos de gabarito configuráveis por documento; não inventar clientes, métricas ou depoimentos.

## Evidence on Hand

| Evidência | Onde |
|---|---|
| Modelo de produto (domínio, regras, funcionalidades, fluxos) | `docs/product/` |
| Backlog ICE priorizado | `.cursor/skills/portulan-ice/backlog.md` |
| Skill e referência MCP para agentes | `.cursor/skills/portulan-mcp/` |
| Documentos de exemplo (seed) | criados na primeira execução local |
| README operacional | `README.md` |

**Ausências que trabalho futuro não deve fabricar:** testimonials, logos de clientes, benchmarks de mercado, pricing, SLAs não documentados.

## Product Principles

1. **Uma cartoteca, duas interfaces** — UI e MCP devem refletir as mesmas regras e capacidades, no mesmo porto; divergência é bug de produto.
2. **Rascunho vivo, publicação imutável** — editar não reescreve o passado; cada publicação é um snapshot com link próprio.
3. **Markdown com contrato** — componentes vêm do catálogo; sintaxe e regras vivem no modelo (`RN`/`F`), não espalhadas no código.
4. **Links estáveis** — `/d/{uuid}` sobrevive a renomear título; `/p/{id}` preserva a versão exata.
5. **Privado por padrão** — a carta nasce em camarote; abrir ao porto ou ao mar aberto é decisão explícita do cartógrafo, nunca efeito colateral de publicar.
6. **Fechar o modelo** — mudança de comportamento atualiza `docs/product/` na mesma sessão.

## Accessibility & Inclusion

Sem requisito normativo explícito documentado. Expectativa baseline: controles nomeados, foco visível, contraste herdado do sistema shadcn/Tailwind do projeto. Requisitos WCAG específicos permanecem **em aberto** até definição do time.
