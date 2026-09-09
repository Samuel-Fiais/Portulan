# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** pessoas em times técnicos (produto, engenharia, operações, documentação) que precisam **criar, revisar, publicar e compartilhar** relatórios e documentos técnicos em Markdown — com prévia fiel, PDF e links públicos estáveis.

**Secondary:** **agentes** (via MCP com token pessoal) que operam a mesma biblioteca do usuário autenticado — listar, ler, criar, editar, duplicar, publicar e gerenciar documentos sem UI paralela.

**Situação típica:** elaborar um relatório de incidente, referência técnica, roadmap ou documentação interna; iterar em rascunho com colegas; publicar snapshot imutável para leitores externos ou stakeholders; reutilizar templates e componentes Markdown padronizados.

## Product Purpose

O Portulan é um **workspace editorial** para documentos técnicos: rascunho vivo, revisão colaborativa, publicação com versões imutáveis e leitura pública/ impressão. Sucesso significa que autor e agente conseguem ir do zero ao link `/d/{uuid}` ou `/p/{id}` com consistência visual (template), componentes ricos e regras de negócio previsíveis.

## Positioning

Paridade **humano + agente** na mesma biblioteca (UI e MCP), com **releases imutáveis** e **slug UUID estável** — vizinhos podem ter editor Markdown ou publicação, mas não combinam catálogo de diretivas `:::`, histórico de versões com diff/restauração, comentários de revisão no editor e operação MCP documentada na mesma superfície.

## Operating Context

- **Workspace autenticado:** dashboard, biblioteca (busca no corpo, filtro por status/template), templates, integrações MCP.
- **Editor:** título, resumo, Markdown, metadados, prévia lado a lado, autosave, atalhos, export PDF/Markdown, componentes do catálogo.
- **Publicação:** snapshot imutável por release; links `/d/{uuid}` (última ativa) e `/p/{id}` (versão fixa); histórico com comparar, restaurar e desativar.
- **Leitura pública:** `/d` e `/p` sem login; TOC com âncoras; Mermaid; blocos living (checklist local no navegador).
- **Colaboração:** convite por e-mail (leitor/editor); comentários de revisão só no editor autenticado.
- **Autenticação:** GitHub (Auth.js).
- **Persistência:** Postgres (Neon) em produção; SQLite local em dev; Blob (Vercel) para imagens e anexos.

Modelo de negócio detalhado (entidades, regras `RN-xx`, funcionalidades `F-…`, fluxos): `docs/product/`.

## Capabilities and Constraints

**Confirmado (existe):**

- CRUD de documentos e templates; compartilhar; publicar/desativar; duplicar (UI e MCP).
- Catálogo de componentes Markdown (`:::alert`, gráficos, checklist, etc.) compartilhado entre modal do editor e MCP.
- Busca na biblioteca e MCP incluindo corpo do documento.
- Autosave, atalhos Markdown, diff de versões, restaurar release, comentários de revisão.
- PDF A4, export `.md`, tokens MCP pessoais.

**Limites de produto (não negociáveis sem mudança de modelo):**

- Checklist living persiste só no navegador do leitor (localStorage), não no servidor.
- Status editorial (`draft` / `review` / `published` / `archived`) é rótulo; não dispara workflow automático.
- Comentários de revisão não aparecem em `/p` nem `/d`.
- Conteúdo ≤ 250.000 caracteres; até 12 tags; título 3–180 caracteres.

**Terminologia:** documento (rascunho), release/versão publicada, template, responsável, editor convidado, leitor convidado, agente MCP.

## Brand Commitments

- **Nome:** Portulan.
- **Voz:** português do Brasil; tom técnico, direto, sem marketing vazio; labels de produto em mono onde a UI já estabelece isso.
- **Identidade:** login GitHub; marca e logos de template configuráveis por documento; não inventar clientes, métricas ou depoimentos.

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

1. **Uma biblioteca, duas interfaces** — UI e MCP devem refletir as mesmas regras e capacidades; divergência é bug de produto.
2. **Rascunho vivo, publicação imutável** — editar não reescreve o passado; cada publicação é um snapshot com link próprio.
3. **Markdown com contrato** — componentes vêm do catálogo; sintaxe e regras vivem no modelo (`RN`/`F`), não espalhadas no código.
4. **Links estáveis** — `/d/{uuid}` sobrevive a renomear título; `/p/{id}` preserva a versão exata.
5. **Fechar o modelo** — mudança de comportamento atualiza `docs/product/` na mesma sessão.

## Accessibility & Inclusion

Sem requisito normativo explícito documentado. Expectativa baseline: controles nomeados, foco visível, contraste herdado do sistema shadcn/Tailwind do projeto. Requisitos WCAG específicos permanecem **em aberto** até definição do time.
