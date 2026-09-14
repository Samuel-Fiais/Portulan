---
target: modal Comparar Versões
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
target_identity: "file:/Volumes/FIAIS/Projects/Fiais/Portulan/components/version-diff-dialog.tsx"
target_fingerprint: "sha256:5660e064c39888e342dc04602c1a11172b1e01019bcac9bda902e3945151291e"
target_path: /Volumes/FIAIS/Projects/Fiais/Portulan/components/version-diff-dialog.tsx
timestamp: 2026-09-09T17-46-59Z
slug: components-version-diff-dialog-tsx
---
# Critique: Modal "Comparar versões"

Method: dual-agent (A: c404280c-bf9e-4562-bb84-d1fff6618783 · B: 67539f31-1506-4edf-9800-323302d98276)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Há diferenças" é binário; sem contagem +N/−M nem estado de carregamento |
| 2 | Match System / Real World | 1 | Remoções em teal (#00D4B4); adições quase invisíveis (#f0f2f7) — inverte convenção universal de diff |
| 3 | User Control and Freedom | 3 | Seletores, swap, colapsar linhas iguais, fechar modal |
| 4 | Consistency and Standards | 2 | Chrome Portulan coeso; semântica de cores herda `.fp-diff` do relatório, não do workspace |
| 5 | Error Prevention | 3 | Impede selecionar a mesma versão nos dois lados |
| 6 | Recognition Rather Than Recall | 3 | Labels "Base"/"Comparar com"; vocabulário alinhado à aba Histórico |
| 7 | Flexibility and Efficiency | 3 | Colapsar iguais por padrão; swap em um clique |
| 8 | Aesthetic and Minimalist Design | 3 | Grid limpo, mono nos cabeçalhos; flood teal e truncamento de metadados geram ruído |
| 9 | Error Recovery | 2 | `diff` nulo renderiza vazio — sem mensagem nem recuperação |
| 10 | Help and Documentation | n/a | Modal Operate com descrição inline (técnica, mas presente) |
| **Total** | | **22/36** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** Parcialmente autoral. A estrutura — stamps quadrados, hairlines, IBM Plex Mono nos cabeçalhos, seções "Metadados" / "Conteúdo Markdown" — é Portulan. Mas o núcleo da experiência (diff) herda `.fp-diff` do bloco de relatório, onde `--accent-2` (teal) é cor de destaque positivo, não de remoção. O modal parece um componente de fidelidade de relatório colocado numa tarefa de workspace, não uma superfície de comparação pensada para restaurar versões.

**Deterministic scan:** 115 findings no detector (exit 2); 0 no TSX. Apenas 4 tocam o bloco version-diff/fp-diff (font-size 12px off-ramp; cores de `.fp-terminal` adjacentes). Nenhum hit de radius/shadow no bloco — conforme DESIGN.md. O detector não flagou o mapeamento invertido de cores porque `--accent`/`--accent-2` são tokens documentados.

**Visual overlays:** Não disponíveis — servidor em localhost:3000 exige login GitHub; injeção de `detect.js` bloqueada. Evidência visual baseada no screenshot do usuário e no CSS.

## Overall Impression

O modal tem boa fundação estrutural e controles sensatos, mas falha no teste de alfabetização de diff: linhas removidas aparecem em teal (cor "positiva" da marca), adições somem no fundo branco, e metadados truncados impedem a decisão de restaurar. A maior oportunidade é corrigir semântica de cores e fechar o loop compare → restaurar.

## What's Working

1. **Colapsar linhas iguais por padrão** — `collapseUnchanged: true` com marcadores `… N linhas iguais …` reduz fadiga de scroll em documentos longos.

2. **Controles de comparação eficientes** — grid de três colunas (Base | swap | Comparar com), opções desabilitadas no lado oposto, swap com `GitCompareArrows` e `aria-label`.

3. **Hierarquia de seções** — metadados separados do Markdown; cabeçalhos em mono 9px uppercase seguem o padrão stamp do Portulan.

## Priority Issues

### [P0] Semântica de diff invertida (teal = removido)

- **Why it matters:** No screenshot, todas as linhas com `−` têm fundo teal. O cérebro lê teal como "adicionado/seguro/marca". Contradiz a descrição do modal e toda ferramenta de diff que o usuário conhece. Destrói confiança antes de uma ação destrutiva-adjacente (restaurar).
- **Fix:** Desacoplar cores do `.fp-diff`. Criar tokens `--diff-added` / `--diff-removed` no workspace: removido → `--destructive` (#DC2626) com fundo `--s-err-bg`; adicionado → `--s-ok` ou Sounding Teal Ink. Adicionar legenda `− removido` / `+ adicionado`.
- **Suggested command:** `/impeccable colorize`

### [P1] Truncamento de metadados esconde dados da decisão

- **Why it matters:** `.version-diff-fields dd span` usa `white-space: nowrap; text-overflow: ellipsis` — título, resumo e tags ficam cortados; o usuário não lê o antes/depois completo.
- **Fix:** `white-space: pre-wrap; word-break: break-word` nos valores; labels "antes"/"depois" nos pares; remover ellipsis.
- **Suggested command:** `/impeccable layout`

### [P1] Copy técnica na descrição

- **Why it matters:** "Diff de metadados e Markdown entre o rascunho ou snapshots publicados" lê como nota de dev, não orientação Operate.
- **Fix:** Ex.: *"Veja o que mudou entre duas versões. A **base** é o ponto de partida; linhas com **−** saíram dela, linhas com **+** existem só na outra versão."*
- **Suggested command:** `/impeccable clarify`

### [P2] Sem caminho de conclusão (comparar → restaurar)

- **Why it matters:** Restaurar vive na aba Histórico (`AlertDialog`), desconectado do modal. O usuário fecha, perde contexto, procura a release na lista.
- **Fix:** `DialogFooter` com "Fechar" e "Restaurar [versão] no rascunho" quando o lado direito é uma release e o usuário tem permissão de edição.
- **Suggested command:** `/impeccable shape`

### [P2] Sinais de magnitude ausentes

- **Why it matters:** "Há diferenças" é binário. Power users querem `+12 −8 linhas · 2 metadados` para triagem rápida.
- **Fix:** Expor `diffSummary()` de `lib/version-diff.ts` na barra `.version-diff-summary`.
- **Suggested command:** `/impeccable layout`

## Persona Red Flags

**Alex (power user):** Sem contagem de linhas na summary; sem atalho para próxima mudança; cores teal em remoções conflitam com semântica positiva da marca em outros blocos.

**Jordan (first-timer):** Adições invisíveis (#f0f2f7 sobre branco); descrição não explica qual versão é "mais antiga"; abre "Comparar com v2", lê o diff, fecha — não descobre que restaurar é ação separada no dropdown.

**Sam (accessibility):** Codificação só por cor (tint 10%); prefixos `+`/`-` a 12px mono fáceis de perder; metadados com nowrap quebram em zoom 200%; close button com sr-only "Close" em inglês no `DialogContent` base.

## Minor Observations

- Classe `fp-diff` no Markdown acopla modal de workspace à camada de fidelidade de relatório.
- Toggle "Ocultar linhas iguais" em `ghost xs` — peso visual baixo, fácil de não notar.
- Summary usa `v2 → v1` mas não clarifica direção temporal vs. git "old..new".
- Diff é linha-a-linha (LCS); mudanças dentro de uma linha não aparecem.
- Scroll aninhado: `.version-diff-body` e `.version-diff-content` ambos com `overflow: auto`.

## Questions to Consider

- O teal de remoção é intencional por coerência de marca, ou herança acidental do `.fp-diff`?
- "Comparar versões" é inspeção read-only ou primeiro passo de restaurar? Se o segundo, por que a ação destrutiva está fora?
- "Base" significa "mais antiga" ou "ponto de referência"? Vale trocar por labels temporais?
