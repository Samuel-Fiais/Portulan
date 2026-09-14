---
target: components/integrations-panel.tsx
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Volumes/FIAIS/Projects/Fiais/Portulan/components/integrations-panel.tsx"
target_fingerprint: "sha256:f6f4ab85ea458281f7fee169f42ef0b8e226cafbdf4a2e786c755f7ff92da8e8"
target_path: /Volumes/FIAIS/Projects/Fiais/Portulan/components/integrations-panel.tsx
timestamp: 2026-09-11T19-03-41Z
slug: components-integrations-panel-tsx
---
Method: dual-agent (A: 60e3bff8-9691-40b0-88dc-09567405ead1 · B: 83ee4d7f-9d29-49c0-8a54-f5f806bf77a9)

# Critique — Agentes e integrações
**Target:** `components/integrations-panel.tsx` · Route `/integrations` · Mode **Operate**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Toasts and one-time reveal exist; generate/revoke `pending` is silent (disabled only); endpoint hydrates from `/api/mcp` after paint |
| 2 | Match System / Real World | 2 | pt-BR voice is right; hero prose paints as a smashed word-string; `.tool-list` shows 9 of ~28 registered tools |
| 3 | User Control and Freedom | 2 | Dialog has `Cancelar`; revoke has no undo; reveal has no dismiss |
| 4 | Consistency and Standards | 2 | Chart chrome is on-model; DESIGN breaks: 1380 vs 1100px measure, outline vs Chart Ink primary, ghost vs destructive revoke, `h1`→`h3` |
| 5 | Error Prevention | 1 | `Revogar` is one click, irreversible, no confirm; empty name on generate returns silently |
| 6 | Recognition Rather Than Recall | 2 | Endpoint and Bearer scheme are on-page but not copyable; tools have no gloss |
| 7 | Flexibility and Efficiency | 2 | Enter submits the name field; no copy-endpoint control; one `pending` locks every `Revogar` |
| 8 | Aesthetic and Minimalist Design | 2 | Stamps and 3px bar are earned; 9-line dump + three equal cards + smashed hero type are not |
| 9 | Error Recovery | 2 | Toast errors and clipboard fallback exist; revoke is unrecoverable; some errors do not point at a field |
| 10 | Help and Documentation | 2 | Inline Bearer + `Copiar skill`; no numbered connect; empty state does not teach; tools have no legend |
| **Total** | | **19/40** | **Poor** |

## Design Specificity Verdict

**Start here.** Authored for Portulan in chrome; category-interchangeable in task architecture.

**LLM assessment:** The page speaks the chart: `.integration-panel` is a square stamp on muted wash with a 3px Chart Ink top bar; `.integration-icon` is a 42×42 navy square; titles are JetBrains Mono; Seal Wax eyebrows (`Autenticação MCP`, `Skill para agentes`); hairline token table; radius 0; no shadow. That is not default shadcn.

The *job* is every developer-settings “API keys” screen: manifesto card + endpoint chip + capability list + token table + optional SDK dump. `.tool-list` is a generic sidebar of snake_case names. Lucide `Bot` is a category icon, not the three-bar brand mark. The only Chart Ink fill on the page is the decorative robot stamp — identity used as ornament, the real action (`Gerar token MCP`) used as void.

PRODUCT principle 1 is “Uma biblioteca, duas interfaces.” The hero line says that and then fails to stage it as rumos: no Sounding Teal Ink `01 / 02 / 03`, no copy-stamp on the endpoint, no sequenced connect. A Linear / GitHub / Vercel token page could wear these three stacked cards with a palette swap.

The user-attached crop makes the specificity claim worse: the manifesto — the one place Portulan’s voice should be felt — paints as a smashed word-string, while underscored tool names stay crisp. Chrome survived; prose did not.

**Deterministic scan:** `impeccable detect --json components/integrations-panel.tsx` exited 0 with `[]` — 0 findings, 0 rules. The detector was pointed at markup only (CSS-only files are out of scope). It therefore missed the P0 typesetting defect (paint-time, in `app/globals.css` `.integration-panel h3` / `p`) and the incomplete 9-of-28 tool catalog (hardcoded spans, not a detectable pattern). Agreement with the LLM review: none on defects — the scan is a false clean, not a clean surface.

**Visual overlays:** No reliable user-visible overlay is available on `/integrations`. Mutation preflight succeeded and `http://localhost:8400/detect.js` injected, but GitHub login blocked the target (`/login?callbackUrl=…/integrations`). Overlay chrome ran on the login wall only (kicker “Acesso”, undersized 10px eyebrow, plus overlay-artifact glow / occlusion / height transition). Those login findings are not findings against this target.

## Overall Impression

The instrument face is right and the product voice in source copy is right. The surface still fails the job: connect an agent in one sitting. The single biggest opportunity is to stop treating this as a brochure with a token table attached, and stage it as three rumos — copy the endpoint, generate and copy the token, optionally take the skill — with the manifesto demoted and the smashed hero type repaired first.

## What's Working

1. **Instrument chrome is on-model.** 3px Chart Ink bar, square navy stamp, hairline table, Seal Wax eyebrows. This is a Portulan gazette panel, not a lifted card.
2. **The generate dialog handles the dangerous default.** Validade defaults to 30 days; `never` surfaces `Atenção` about tokens that stay valid until revoke. One-time reveal copy is honest: “Copie agora — ele não será exibido novamente.”
3. **Source copy matches the product.** “Conecte um cliente MCP com a identidade do seu usuário Portulan” is principle 1 in a sentence. The failure is staging and paint, not positioning.

## Priority Issues

**[P0] Hero prose paints with collapsed word spaces**
- **What:** User crop of `.integration-panel`: `h3` and `p` run together (“Umabibliotecaqueagentestambémconseguemmater.”). `.tool-list` and `code` chips stay readable. JSX contains correct spaces — this is paint, not missing copy. Source CSS sets `.integration-panel h3` to `font: 600 16px/1.35 var(--font-mono)` with no tracking reset; body `p` inherits Plex at muted ink. Detector did not see it.
- **Why it matters:** The first sentence on the connect surface is illegible. An Operate user cannot trust a settings page that cannot set type.
- **Fix:** Restore word spaces on `.integration-panel h3` and `p` until “Uma biblioteca que agentes também conseguem manter.” reads as words. Keep the chips. Check tracking, word-spacing, webfont space glyph, and any inherited display tracking from the dashboard register.
- **Suggested command:** `/impeccable typeset`

**[P1] High-stakes revoke is a ghost one-click**
- **What:** Table action `Revogar` (`variant="ghost"` `size="sm"`) calls `revokeMcpTokenAction` with no confirm and no undo. DESIGN reserves destructive fill for delete-token.
- **Why it matters:** Users will revoke the wrong agent credential. That is a support-level mistake, not an annoyance.
- **Fix:** Confirm (inline or dialog) naming the token; destructive stamp; do not global-disable sibling rows on `pending`.
- **Suggested command:** `/impeccable harden`

**[P1] Connect-an-agent is a wall, not rumos**
- **What:** First paint = manifesto + 9 inert tools + tokens + skill. Endpoint `<code>` is not a copy control. Two outline CTAs of equal weight (`Gerar token MCP`, `Copiar skill`). After reveal, `Copiar token` is outline too. Page measure is `.dashboard-main` at 1380px; DESIGN says 1100px for integrations.
- **Why it matters:** A first-timer cannot see the next step in five seconds; a power user cannot finish in one copy. Working memory has to carry endpoint + Bearer scheme + a one-time secret into an external client.
- **Fix:** Sequence 01 endpoint (copy stamp) → 02 gerar/copiar token (Chart Ink fill) → 03 skill optional. Hide or group the catalog.
- **Suggested command:** `/impeccable distill`

**[P1] `.tool-list` is an incomplete, unlabeled catalog**
- **What:** Nine names (`list_templates` … `delete_document`). The MCP route registers ~28 tools (`restore_document`, `duplicate_document`, uploads, comments, templates CRUD, `get_system_guide`, …). No heading, no gloss, not copyable.
- **Why it matters:** Recognition failure and a product lie of omission against the agent fluxo. Nine items also blow the ≤4 working-memory rule.
- **Fix:** Drop the dump, or disclose grouped (docs / templates / files / review) behind a short legend. Do not imply this is the full surface.
- **Suggested command:** `/impeccable distill`

**[P2] Empty and post-success states don’t teach or close**
- **What:** `Nenhum token ativo.` is a table cell. Skill disabled with no in-place explanation. Reveal is a muted bar; copy is outline.
- **Why it matters:** First-timer stalls; peak-end is cold after the one moment that should feel like unlocking the second interface.
- **Fix:** Empty state = one sentence + the generate stamp. After generate, Chart Ink `Copiar token` (consider auto-copy). If the skill file is missing, say so in-place.
- **Suggested command:** `/impeccable onboard`

## Cognitive load

7 of 8 checklist items fail (only Grouping passes). Rating: **high**. Decision point with >4 options: `.tool-list` (9 tools), plus the first-paint choice between hero, generate, and skill.

## Emotional journey

Intended peak: unlocking the second interface. Actual path: smashed manifesto → nine mute tool names → a calm generate dialog (the only reassurance) → an under-played one-time reveal (outline copy, gravity in a toast) → ghost `Revogar` with no ritual → administrivia. Peak-end rule: the peak is under-played and the end is a table of prefixes.

## Persona Red Flags

Primary action walked: read endpoint → generate token → copy → optionally copy skill.

**Alex (Power User):** No copy control on the endpoint or Bearer chip. Generate is outline + modal, not a single stamp. One `pending` disables every `Revogar`. `.tool-list` is neither copyable nor complete. `Copiar skill` is an opaque blob — Alex already has the skill on disk and wants a config snippet.

**Jordan (First-Timer):** In five seconds the eye hits a smashed manifesto and nine `snake_case` names, not “gere um token.” MCP, Bearer, `ptl_…`, skill, and `portulan-mcp` are unexpanded. Empty `Nenhum token ativo.` does not point at `Gerar token MCP`. Nav says `Integrações`; h1 says `Agentes e integrações`.

**Sam (Accessibility-dependent):** Hero `h3`/`p` unreadable in the crop. Heading skip `h1` → `h3`. `.integration-skill-meta { display: contents }` flattens the token and skill groups. Decorative `<Bot />` is not `aria-hidden`. Token string has no `aria-live`; success is toaster-only. Controls are 28px, below 44px. Muted body on muted panel is borderline contrast.

**Rafa (Technical author connecting an MCP agent)** — project-specific from PRODUCT.md secondary user: Hero catalog omits tools the fluxo actually names. No Cursor/Claude HTTP snippet. Endpoint `useEffect` starts as `/api/mcp` — a fast copy before hydrate produces a broken client config. `Último uso` exists in the table but is easy to miss as reassurance that the agent actually connected.

## Minor Observations

- `.page-wrap.dashboard-main` → 1380px; DESIGN measure for integrations is 1100px.
- `.fp-h1` / `.fp-lead` (17px) on a settings page use the dashboard display register, not tool chrome.
- Two labels for one act: trigger `Gerar token MCP` vs dialog primary `Gerar token`.
- `.tool-list` has no accessible name.
- Clipboard-failure toast may contain the raw secret in `description`.
- Lucide `Bot` vs the three-bar brand mark — identity not used where a stamp would carry more Portulan.
- Authenticated `/integrations` was not seen live by either agent (GitHub login wall). Hero visual truth is the user-attached crop; token table, skill block, dialogs, and mobile layout were judged from source + CSS.

## Questions to Consider

- What if this page were three numbered rumos (01 endpoint, 02 token, 03 skill) and the manifesto line were demoted to an eyebrow?
- Why is a 9-name `.tool-list` on the hero if it is neither complete nor actionable?
- If the token can be seen once, why isn’t `Copiar token` the only Chart Ink fill on the page — and why isn’t it copied on generate?
- Would Rafa trust “uma biblioteca que agentes também conseguem manter” more from a copy-paste Cursor config than from a robot icon and a tool dump?
- Is `Revogar` allowed to be quieter than `Gerar` when it is the irreversible act DESIGN already named?
