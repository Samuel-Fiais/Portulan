---
target: components/report-preview.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Volumes/FIAIS/Projects/Fiais/Portulan/components/report-preview.tsx"
target_fingerprint: "sha256:5d0e3727eb6ad0dfd40e4b6e8101353755cd9b6957f9cb7c1c998822f4973875"
target_path: /Volumes/FIAIS/Projects/Fiais/Portulan/components/report-preview.tsx
timestamp: 2026-09-09T18-11-27Z
slug: components-report-preview-tsx
closed: true
---
# Critique: Papel do relatório (ReportPreview)

Method: dual-agent (A: 98d9b705-f107-4fb1-b43c-5ebf9a84d235 · B: ab5285fc-e598-479a-b48c-e6379684712d)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Capa mostra status duas vezes (badge + meta); Mermaid pendente sem copy visível; checklist público é local e não anunciado |
| 2 | Match System / Real World | 3 | pt-BR fluente; erros Mermaid dumpam texto de engine; rodapé Confidencial (editor) vs versão (público) sem explicação |
| 3 | User Control and Freedom | 2 | Índice só com `publicView`; `no-print` tira o TOC do PDF; artigo preso em layout `<table>`; checklist público sem reset |
| 4 | Consistency and Standards | 2 | Três papéis (editor / público / impressão) com geometria, sombra, borda e TOC diferentes; código escuro vs `.report-code` claro no print |
| 5 | Error Prevention | 2 | Checklist living clica sem confirmação; ticks públicos não batem com o snapshot `/p`; testcase só persiste se `persistable` |
| 6 | Recognition Rather Than Recall | 2 | Preview do editor sem Índice; dicas living em hover/`::before`; theme toggle parece chrome de app |
| 7 | Flexibility and Efficiency | 3 | Âncoras no TOC público, Expandir/Recolher FAQ, Copiar, teclado no checklist. Sem skip-to-content; TOC fora do print |
| 8 | Aesthetic and Minimalist Design | 2 | Letterhead é gazeta. Corpo mistura Lucide, banners sólidos, ~59 diretivas, terminais IDE e FAB de tema |
| 9 | Error Recovery | 2 | Falha Mermaid é `<pre class="fp-mermaid-error">` cru; figura quebrada sem fallback desenhado |
| 10 | Help and Documentation | 2 | Índice é a ajuda de navegação — ausente no editor e no print. Nenhuma copy de que o checklist é só no navegador |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** A capa é Portulan. `tmpl-doc-header`, a barra `tmpl-header-bar` (acento do template), título `fp-h2` em IBM Plex Mono, resumo em Plex Sans e a meta de quatro células (Status / Responsável / Time / Atualizado) leem como timbre de gazeta, não como página SaaS. FAQ `+/−` em mono, iniciais quadradas e list markers no acento continuam nesse mundo.

O corpo é intercambiável com GitBook/Notion/Linear Docs. `:::alert` é Lucide + tint/solid; `fp-code-block` / `fp-terminal` / `fp-logs` sentam em `#101827`; donuts/gauges e washes preenchidos no `status-badge` poderiam trocar de produto com um font-swap. O gráfico é o letterhead; a carga é um catálogo de componentes.

**Deterministic scan:** `impeccable detect --json` nos arquivos do papel e dos living blocks retornou `[]` (exit 0). Zero regras, zero arquivos. O detector não vê geometria A4 vs full-bleed, `##` renderizado como `div.tmpl-label`, nem estado living vs snapshot. Não há falso positivo — o scan está vazio porque os problemas são de registro e estrutura, não de radius/gradient/shadow no markup que o engine lê.

**Visual overlays:** Nenhuma overlay confiável. Injeção de `detect.js` não rodou: as abas dos assessments não anexaram (`No browser tab available`). No parent, `http://localhost:3000/d/{uuid}` caiu em “Documento não encontrado” (com overlay de issue de dev); catálogo e biblioteca redirecionam para `/login` (Entrar com GitHub). Fallback: review ancorado no source (`report-preview.tsx`, `rich-markdown.tsx`, `globals.css`) e nesses HTTP states — sem pixel do papel vivo.

## Overall Impression

O timbre convence no primeiro viewport e o produto se desfaz na primeira diretiva. O maior ganho não é um componente novo: é **um único papel** — A4, hairline, Índice, código claro — em editor, `/d`, `/p` e PDF, e um corpo de diretivas que fale gazeta em vez de kit de documentação.

## What's Working

1. **Letterhead** — logo, tipo em caixa alta, barra de acento do template, título mono e meta 4-up. Isso é o norte criativo (“The Portolan Chart”).
2. **Cadência de seção** quando o corpo é prosa — `tmpl-section` com hairline, `tmpl-label-index` numerado, Plex Sans ~15px / 1.65–1.7.
3. **Blocos que já são Portulan** — `fp-faq` nativo, `fp-properties` / `fp-glossary` em hairline, `fp-people` quadrado, `fp-action` outlined. Não precisam de redesenho; o resto do catálogo precisa chegar nesse nível.

## Priority Issues

**[P1] Três papéis diferentes**
- **What:** Editor (`.preview-pane .report-paper`: full-bleed, sem sombra, sem TOC). Público/rascunho (`.public-document-shell .report-paper`: `width: 100%; border: 0; box-shadow: none` + `ThemeToggle`). Print (A4, sem borda, TOC com `no-print`). Onde o frame sobrevive, ainda há `box-shadow: 0 10px 32px rgba(0,0,0,.13)` — dívida explícita do DESIGN.md.
- **Why it matters:** O revisor técnico não pode confiar que preview = `/d` = PDF. Jordan nunca vê uma folha sobre a mesa.
- **Fix:** Uma geometria de leitura: `min(210mm, 100%)`, Hairline 1px, zero drop shadow, Índice em toda superfície de leitura com headings — inclusive preview do editor e print.
- **Suggested command:** `/impeccable layout`

**[P1] Outline de heading é falso**
- **What:** `##` vira `<div class="tmpl-label">` dentro de `<section>`. O outline real é um `h1.fp-h2` e `h3` ocasionais. O TOC lista esses `##` como se fossem headings. O artigo inteiro vive num `<table class="template-document-table">`.
- **Why it matters:** Leitor de tela e teclado não saltam por seção. O Índice aponta para IDs em `section`, não para headings.
- **Fix:** Títulos de seção como `h2` (manter o visual `tmpl-label`). Tirar a tabela de layout da tela; reservar chrome tabular só para print se ainda for necessário.
- **Suggested command:** `/impeccable audit`

**[P1] Estado living que morre na publicação**
- **What:** Checklist público grava `localStorage`; PDF/print não. Controles de `LivingTestcase` só com `persistable`. TOC `no-print`. Código living em `#101827` vs `.report-code` em `#f7f7f7` no print.
- **Why it matters:** Riley acha que o catálogo “funciona”; o artefato `/p` não corresponde. Checkboxes parecem duráveis e não são.
- **Fix:** Em `/d`/`/p`, checklist read-only ou carimbo “só neste navegador”. Print/PDF no mesmo idioma visual do papel (código claro, mesmo Índice).
- **Suggested command:** `/impeccable harden`

**[P2] Capa se repete**
- **What:** `templateName` em `tmpl-doc-type` e `tmpl-label`; status no `fp-badge` preenchido (com `.dot` circular) e de novo na meta; data no header, na meta e no footer. DESIGN.md pede stamp outlined, não wash `status-published { background: var(--s-ok-bg) }`.
- **Why it matters:** A hierarquia colapsa antes do primeiro parágrafo.
- **Fix:** Um status, uma data, um eyebrow de template. Badge outlined, quadrado, sem disco de 6px.
- **Suggested command:** `/impeccable distill`

**[P2] Corpo de diretivas fala GitBook/IDE**
- **What:** Lucide em `fp-alert` (info/success/warning/error/accent × tint/line/solid). `fp-banner` fill cheio. Terminais/logs em `#101827`. Mermaid frame `#fff` hardcoded. `fp-report-card` com radius 2px e transição de sombra.
- **Why it matters:** Depois do letterhead, o papel vira kit de docs.
- **Fix:** Alertas = hairline + eyebrow mono, sem Lucide. Código/logs = instrumentos de papel (superfície + filete 3px), não VS Code. Mermaid em `--bg`. Radius 0.
- **Suggested command:** `/impeccable quieter`

## Persona Red Flags

**Jordan (primeira leitura `/d` ou `/p`):** Neste ambiente o papel público não abre (UUID cai em “Documento não encontrado”; slug legado 404). Catálogo exige GitHub. Quando o papel existir: aviso “Prévia do rascunho · não publicada” + badge Rascunho + meta Status — três jeitos de dizer não publicado. FAB de tema parece produto, não documento. Sem Índice (editor) Jordan se perde.

**Sam (teclado / leitor de tela):** Artigo em tabela de layout. `##` não é heading. Sem skip link. Mermaid pendente é região `aria-busy` sem nome. `fp-living-tip` é hover-first. Checklist `role="checkbox"` e FAQ `<summary>` nativo são os acertos. Scorecard/risco ainda falam cor sem rótulo em alguns blocos.

**Riley (catálogo / stress):** Dezenas de diretivas numa folha; TOC é `<ol>` plano de todos os `##`/`###`. Galeria 3 colunas e actions 4 colunas apertam em ~390px. Mermaid vazio/erro é `<pre>` vermelho. Três fundos: logs escuros, mermaid branco, header cinza.

**Revisor técnico:** Split do editor não é o papel publicado (sem Índice, não é A4). Shell público desarma a folha e adiciona theme toggle. Print tira o TOC. Ticks de checklist e botões de testcase não sobrevivem ao snapshot imutável `/p`. Comentários de revisão já ficam fora desta superfície — não os traga para cá.

## Cognitive Load

Checklist: single focus pass; chunking fail (TOC plano); grouping pass; visual hierarchy fail (status/data/tipo repetidos); one thing at a time pass (relatório normal); minimal choices fail (TOC >4 opções visíveis); working memory pass no público / fail no editor (contado pass para Read `/d`); progressive disclosure pass (FAQ/details).

**3 falhas → carga moderada.** Ponto de decisão sobrecarregado: `report-toc` em documento longo ou catálogo.

## Emotional Journey

Pico no primeiro viewport (logo de três barras, barra de acento, título mono). Vale assim que entra `:::alert` (Lucide) e `fp-code-block` (IDE). No catálogo o vale é longo. O fim é um `tmpl-footer` quieto — depois um sol/lua flutuando. Print ainda tira o Índice, então a última impressão fora da tela é um documento em que não se pula.

## Minor Observations

- `.fp-change-dot` e `.fp-badge .dot` são círculos; a regra é stamp quadrado.
- `h1` usa classe `fp-h2` — o nome visual mente.
- `fp-alert.solid` força texto `#fff` sobre fills warning/gold — contraste a checar.
- `fp-columns` 3–4 e gallery/actions não quebram no gate 760px.
- Copy **Copiar / Copiado** está certa; o ícone Lucide no header escuro é GitHub, não gazeta.
- Sombra incumbente é dívida; o shell público corrige demais ao remover também o Hairline.

## Questions to Consider

- Se o artefato publicado é tinta A4, por que `/d` é artigo full-bleed com FAB de tema?
- Um documento-catálogo ainda é um *relatório*, ou pode ser um objeto de stress feio de propósito?
- Blocos living que não sobrevivem a `/p` e PDF deveriam sequer parecer interativos?
- Se `:::alert` fosse uma regra carimbada e um eyebrow mono, alguém sentiria falta do Lucide?
