---
name: Portulan
description: Workspace editorial para documentos técnicos — carta náutica, tinta e papel, chrome em mono.
colors:
  chart-ink: "#1A2847"
  chart-ink-inverse: "#9EC5F0"
  seal-wax: "#8B2735"
  compass-brass: "#C5A572"
  sounding-teal: "#00D4B4"
  sounding-teal-ink: "#007F70"
  coral: "#F04E37"
  chart-purple: "#7C2BE3"
  chart-indigo: "#3D3580"
  paper: "#FFFFFF"
  ink: "#111111"
  ink-2: "#525252"
  muted-ink: "#6B6B6B"
  ink-3: "#A3A3A3"
  muted-surface: "#F5F5F5"
  rail: "#F7F7F7"
  accent-wash: "#F0F2F7"
  hairline: "#DEDEDE"
  input-stroke: "#D4D4D4"
  destructive: "#DC2626"
  ink-inverse: "#EFEFEF"
typography:
  display:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "clamp(30px, 4vw, 48px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "clamp(26px, 3.5vw, 40px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "24px"
  sp-6: "32px"
  sp-7: "48px"
  control: "28px"
components:
  button-primary:
    backgroundColor: "{colors.chart-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.chart-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "28px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "28px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "28px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
    height: "28px"
  input-focus:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "28px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "3px 6px"
  nav-rail-link:
    backgroundColor: "transparent"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.none}"
    size: "36px"
  nav-rail-link-active:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.chart-ink}"
    rounded: "{rounded.none}"
    size: "36px"
---

# Design System: Portulan

## Overview

**Creative North Star: "The Portolan Chart"**

Portulan is a portolan chart for technical writing: rumos, tinta, and paper. The workspace is a gazette of instruments, not a SaaS dashboard. Density is that of a tool: 14px body, 1px rules, no ornament. Personality is JetBrains Mono — the instrument face of chrome, report titles, section labels, steps, and code — together with the three-bar brand mark (Chart Ink, Seal Wax, Compass Brass) and the 3px navy-to-burgundy rule under the header. IBM Plex Sans is the reading face for sentences on the paper, not the product voice.

The system is editorial ink. Hierarchy is typeset, not decorated. Burgundy eyebrows and teal section numbers are the gazette’s running heads; they are rare on purpose. Soft-SaaS (rounded-lg, card shadows, focus rings, glass, marketing gradients) and default shadcn (8px radius, 3px rings, shadow-sm) are anti-references even though the primitives sit on that library. New screens inherit the chart, not the kit.

Two registers, one world. The authenticated workspace is tool chrome: hairlines, stamps, a 48px rail. The report is reading paper on screen (a web sheet, not A4) and print paper in PDF (A4). Do not dress the editor chrome like a magazine, and do not dress the report like an app shell.

**Key Characteristics:**

- Square stamps: every control, card, and dialog is radius 0.
- Hairline structure: depth is a 1px rule and a tonal wash, never a drop shadow.
- Two tokens, two jobs: JetBrains Mono (`--font-mono`) is the product face — titles, labels, badges, tabs, buttons, stats, and code. IBM Plex Sans (`--font-sans`) is running prose only.
- One action fill per paper stock. Carta uses Chart Ink; Pergaminho umber; Névoa graphite; Costa Sounding Teal Ink; Lacre Seal Wax. Compass Brass stays identity, never a button.
- A 3px identity rule under the header and editor top bar: the stock’s action ink into its accent. Solid action ink on stat cards and integration panels.
- Instrument chrome is 28px tall (`--control-height`). Rail icons stay 36×36 inside a 48px rail.
- Light Carta is canonical. Four other stocks remap paper, action ink, accent, and night — they are registers of the same chart, not a second product. The three-bar mark always stays Chart Ink / Seal Wax / Compass Brass.

## Colors

A cartographic ink set on white paper: one action navy, one sounding teal for enumeration, identity reds and brass used sparingly, document-type inks only on the reading register.

### Primary

- **Chart Ink**: The navy of the chart. On Carta it is the action fill, focus, rail active state, and the 3px top rule on stats and panels. It is always the first bar of the brand mark. In dark Carta, filled buttons use Chart Ink Inverse; the brand bars use a lifted navy (`#2C3E5F`), not the inverse. Other paper stocks keep this navy on the mark and choose a different action ink.

### Secondary

- **Sounding Teal**: High-chroma buoy ink for type “report” and as a report-template accent. Not a second primary button.
- **Sounding Teal Ink**: The readable companion for section numbers (01, 02) and report-type badges. Use this on paper; the bright teal is too loud for text.

### Tertiary

- **Seal Wax**: The middle brand bar. On Carta it is eyebrow, selection, and the header’s trailing stop — never the action fill. On Lacre it *is* the action fill; eyebrow and header trailing stop move to Chart Ink.
- **Compass Brass**: The third brand bar and the default “relatório” template accent. Ornament of identity, not of chrome. Never a button, even on Pergaminho.
- **Coral**, **Chart Purple**, **Chart Indigo**: Document-type inks (incident, feature, reference) and report-paper accents. They color the reading register and type badges; they do not color workspace actions.

### Neutral

- **Paper**: Workspace and card ground.
- **Ink**: Workspace body and titles (`--foreground`). Report running text is a hair denser (`--text` `#0A0A0A`) — same job, not a second ink.
- **Ink 2**: Leads and secondary copy on the paper (`--text-2`, ~64ch).
- **Muted Ink**: Ghost buttons, rail icons at rest, workspace captions (`--muted-foreground`).
- **Ink 3**: Meta counts, placeholders, section descriptors.
- **Muted Surface**: Hover washes on document rows, integration panel fill, preview-label bars.
- **Rail**: Desktop icon rail and mobile drawer ground (`--sidebar`). Not Muted Surface.
- **Accent Wash**: Quiet navy-tinted hover/selection field (`selection-bg` mixes Chart Ink at 7% on paper).
- **Hairline**: Default 1px rule.
- **Input Stroke**: Field border, slightly darker than Hairline so inputs read as instruments.

### Paper stocks

Five grounds, one chart. Each stock has its own paper, action ink, and accent. The three-bar mark and document-type inks stay Carta’s trio.

| Stock | Paper | Action | Accent |
|---|---|---|---|
| **Carta** | White / ink-dark | Chart Ink / Inverse | Seal Wax |
| **Pergaminho** | Vellum / cabin | Umber / brass-light | Rust |
| **Névoa** | Mist / graphite | Slate / steel | Chart Indigo |
| **Costa** | Tide paper / deep water | Sounding Teal Ink / buoy | Chart Ink |
| **Lacre** | Wax wash / wine night | Seal Wax / rose | Chart Ink |

The picker is a stamp grid (Claro / Escuro × six chips in one row). The sixth stamp, **Livre**, uses the same paper + bar structure; clicking it opens the color instrument and that hex becomes the action ink for the chosen mode. Preference is local to the browser. Print and PDF stay white Carta.

### Named Rules

**The Seal Wax Rule.** Seal Wax is the brand’s middle bar. On Carta it is eyebrow and selection, never a primary fill. On Lacre it becomes the action ink; Chart Ink takes the eyebrow.

**The Chart Ink Rule.** On Carta, Chart Ink is the only action fill; the header rule is Chart Ink into Seal Wax. Other stocks pick one cartographic ink as their action (umber, slate, sounding teal, seal wax). Teal, coral, purple, and indigo still enumerate document types; they do not become a second button on the same screen.

## Typography

**Display Font:** JetBrains Mono — the product voice. Workspace chrome *and* report titles, section labels, steps, and code (`--font-mono`, loaded with `next/font`).
**Body Font:** IBM Plex Sans — running prose on the paper and app sentences (`--font-sans`).
**Label/Mono Font:** the same JetBrains Mono. There is no third family.

**Character:** Mono is the face of Portulan. JetBrains Mono is loaded with `next/font` so titles, `##`, steps, and inline code actually paint as mono. IBM Plex Sans stays the reading face for paragraphs. There is no third family and no “incumbent system stack.”

### Hierarchy

- **Display** (700, clamp 30–48px, line-height 1.08, tracking −0.045em): Full masthead titles in JetBrains Mono — not the Biblioteca / Templates / Integrações register.
- **Headline** (700, clamp 26–40px): Dashboard, login, Biblioteca, Templates, and Integrações (`fp-h1`). Editor document title is 700, clamp 24–34px. Title on the paper is 600, clamp 20–28px.
- **Title** (600, 16px, tracking −0.015em): Workspace document rows. Report `###`, step titles, and alert titles are the same family at 13px / 600.
- **Body:** Plex Sans 14px / 1.65–1.7 on the paper and in app copy. Form fields are 12px Plex Sans. Markdown source in the editor is JetBrains Mono 13px / 1.75.
- **Label:** Eyebrows (10px / 600 / tracking 0.12em / uppercase Seal Wax), report `##` / `tmpl-label` (same), the index title (same) and entries (14px / 500; `###` at 13px), tabs, badges (9px / tracking 0.06em), field captions (10px / tracking 0.08em).

### Named Rules

**The Two-Token Rule.** JetBrains Mono is the product face. IBM Plex Sans is running prose. Titles, `##` labels, steps, alerts, the index (title and entries), badges, tabs, buttons, stats, and code use Mono. Do not treat `system-ui` or `ui-monospace` as the designed face on `.report-paper` — that is what made the preview look like SF Pro.

## Layout

The spatial model is a sheet on a desk, not a fluid marketing canvas.

Workspace pages sit in a centered column: 1100px for library, templates, integrations, login; 1380px for the dashboard. Biblioteca, Templates, and Integrações share one register: padding `sp-7` / `sp-6` (48px / 32px), Seal Wax eyebrow, Headline `h1` (clamp 26–40px), and 14px lead. The dashboard is tighter at the top (52px) and uses `clamp(24px, 4vw, 64px)` on the sides. The editor is full-bleed beside a 48px icon rail; the top chrome is 61px (58px inner + 3px identity rule), solid Paper, no frost. Mobile replaces the rail with a 56px sticky bar and a drawer.

Hairline lists (document rows) stack as a single ruled column — one 1px border around the list, 1px between rows, 16–24px internal padding. Grids are auto-fit: stats from 180px, shortcuts from 240px, templates four columns collapsing to two at 1100px and one at 480px. Breakpoints in use: 1100px, 760px (the mobile gate: rail hides, editor preview hides, page padding 16px), 480px.

The report on screen is a second geometry: a full-bleed reading sheet in its pane or public shell (Hairline frame, Paper ground — not a muted desk, not a 46rem column). Editor preview, `/d`, `/p`, and draft preview share that sheet. Print and PDF remain A4 (`210mm × 297mm`). Do not put workspace grids on the paper or A4 margins on the library.

**The Measure Rule.** Workspace content maxes at 1100px (dashboard 1380px). Report reading on screen is full-bleed in its pane. Print/PDF maxes at A4. Leads stay inside ~64ch.

## Elevation & Depth

The system is flat. Surfaces do not lift. Structure is a 1px Hairline, a Muted Surface wash, or a 3px identity bar. Hover is a tonal shift (Muted Surface, Accent Wash), not a shadow. Dialogs, menus, toasts, cards, buttons, and the report sheet set `box-shadow: none`. Focus is a Chart Ink border, not a ring (the dialog close control’s ring is an inherited exception — do not copy it). The template color-picker panel still drops a shadow and uses round thumbs; that is an instrument, not chrome — do not copy it onto overlays.

### Named Rules

**The Hairline Structure Rule.** Depth is border and tone. Never introduce a drop shadow, even on overlays or on the report. If a surface must read as “on top,” use a 1px Hairline against Paper, or a 3px identity bar (Chart Ink on stats/panels, type-ink on document rows).

## Shapes

Everything is a square stamp. `--radius` is 0; Tailwind radius tokens collapse to 0. Buttons, inputs, cards, dialogs, badges, rail icons, template cards, and toasts are sharp. The 3px identity bar is a rectangle, not a pill. Document-type and status badges are outlined rectangles, not chips with fill.

Tolerated exceptions, not a scale: the brand-symbol bars use 1px radius so a 8×10–17px mark does not look like noise; report inline code uses 4px because it sits in running sans; color-picker thumbs and hue, donut/gauge charts, and 2px meta dots are circles because they are instruments or punctuation. Do not promote any of these into `rounded.sm`.

**The Square Stamp Rule.** Radius is 0. If a control looks friendly, it is wrong.

## Components

Controls are **stamped, not drawn**: filled or voided rectangles on paper. The weight is in the type and the ink, not in rounding or glow. Hover is a border shift to Chart Ink or a 10% wash; focus-visible is the same Chart Ink border with no ring; disabled is 50% opacity.

### Buttons

- **Shape:** Square stamp (0). Border 1px. JetBrains Mono 12px / 600 / wide tracking. Height 28px default (`--control-height`; sm stays 28px, lg 40px, xs 24px).
- **Primary:** Chart Ink fill, Paper text, Chart Ink border. Hover: Chart Ink at 90%. The only filled action on a screen.
- **Outline:** Paper fill, Ink text, Hairline border. Hover: Chart Ink border and text.
- **Ghost:** Transparent, Muted Ink text, Hairline border. Hover: Chart Ink border and text, still no fill.
- **Destructive:** Destructive fill, Paper text — reserved for irreversible acts (delete token, disable release).
- **Hover / Focus:** Color and border only, 150ms ease. Focus-visible = Chart Ink border, ring 0.

### Chips

- **Style:** Transparent ground, 1px Hairline, JetBrains Mono 9px / 600 / uppercase / tracking 0.06em. Mini-tags are the same at 9px with Ink 3.
- **Type badges:** Transparent fill (never the type color as a block). Text takes the type ink (Sounding Teal Ink, Coral, Chart Purple, Chart Indigo).
- **Status:** Draft/archived in Muted Ink; review `#B56700`; published `#168348`; disabled `#B42318` — outline mixed 45% into Hairline. Status is a label, not a pill of paint.

### Cards / Containers

- **Corner Style:** Square (0).
- **Background:** Paper, or Muted Surface for inset panels (integration).
- **Shadow Strategy:** None. See Hairline Structure.
- **Border:** 1px Hairline. Primary surfaces add a 3px Chart Ink bar on the top edge (stat cards, integration panel). Document rows use a 3px type-ink bar on the leading edge.
- **Internal Padding:** 24px (`sp-5`) for stats and template cards; document rows 16–24px; lists share one outer rule rather than each card floating.

### Inputs / Fields

- **Style:** Square, Paper fill, Input Stroke border, 12px Plex Sans (mono when the field is a title, caption, or token). Height 28px. Captions above fields are Label (uppercase mono, Muted Ink).
- **Focus:** Border Chart Ink, no ring, no glow.
- **Error:** Destructive border (`aria-invalid`).
- **Disabled:** 50% opacity. Editor title/summary are the exception: borderless, transparent, headline-sized mono on the page itself.

### Navigation

- **Rail (desktop):** 48px, Rail ground, 36×36 square icon buttons, 18px icons. Default Muted Ink; hover Ink Inverse wash; active Chart Ink on a 12% Chart Ink wash. Tooltips, not labels, on the rail. The compact brand mark in the rail is 24px; the three-bar symbol is 22×22.
- **Header:** Sticky Paper; 3px gradient bar Chart Ink 55% → Seal Wax 100% along the bottom. Wordmark ~40px (`2.5rem`). Text nav is JetBrains Mono 11px / 500; hover draws a Hairline box and Chart Ink text.
- **Mobile:** 56px top bar, Hairline bottom; drawer over a 55% Paper scrim. No floating tab bar.
- **Editor tabs:** 39px, Hairline between tabs, no radius. Active = inset 2px Chart Ink along the bottom (not a filled pill).

### Brand mark

Three vertical bars, rotated −9deg, 22×22: Chart Ink, Seal Wax, Compass Brass. This is the only place the three identity inks sit side by side. Do not redraw it as a circle, wordmark-only, or a filled square.

### Report paper (reading register)

A full-bleed web sheet in its pane (Paper ground, Plex Sans 14px / 1.68 for prose, JetBrains Mono for titles, labels, the index, and code, Hairline frame). Editor preview, public `/d`/`/p`, and draft preview are the same object. Accents come from the document template. Living blocks may use a 1px Hairline hover, not a lift. Code, terminal, logs, and alerts are paper instruments (Hairline + 3px top bar), not IDE chrome. Print/PDF is A4, not this web measure.

## Do's and Don'ts

### Do:

- **Do** set radius to 0 and borders to 1px Hairline on every new control, card, and overlay.
- **Do** keep JetBrains Mono as the product face (chrome, report titles, `##` labels, the index, code) and IBM Plex Sans for running prose only.
- **Do** use the stock’s single action ink as the only filled primary; keep the 3px header rule as action → accent and the 3px card/panel bars as that action ink.
- **Do** stamp chrome at 28px (`--control-height`) unless the control is explicitly lg (40px) or xs (24px).
- **Do** treat Seal Wax as eyebrow/selection/brand, Sounding Teal Ink as enumeration, Compass Brass as identity.
- **Do** keep workspace measure at 1100px (dashboard 1380px), report reading full-bleed in its pane on screen, and A4 only in print/PDF.
- **Do** write product UI in Portuguese (pt-BR), technical and direct — labels in mono where the chrome already does.
- **Do** let each paper stock remap action, accent, and paper, and keep the brand bars on Chart Ink / Seal Wax / Compass Brass (lifted in `.dark`).

### Don't:

- **Don't** use rounded-lg, pills, glass, marketing gradients, or drop shadows on chrome (Soft-SaaS). The color-picker thumbs and its panel shadow stay where they are; they are not a license for menus or dialogs.
- **Don't** ship default shadcn look: 8px radius, 3px focus rings, `shadow-sm` / `shadow-md`.
- **Don't** put two action fills on the same screen, or fill a Carta button with Seal Wax, teal, coral, purple, or gold. Lacre may fill with Seal Wax; Costa with Sounding Teal Ink; Pergaminho with umber — not with brass.
- **Don't** put Plex Sans on tabs, badges, or report titles, or let `system-ui` / `ui-monospace` become the face of `.report-paper`.
- **Don't** swap JetBrains Mono for Geist, Inter, IBM Plex Mono, or a system-only stack, and don't add a third family.
- **Don't** dress the editor chrome like a magazine, or the report like an app shell.
- **Don't** force A4 (`210mm`) or a 46rem column on the editor preview or public reading sheet; that print geometry is PDF only, and screen paper fills its pane.
- **Don't** invent testimonials, client logos, or decorative illustration; identity is the three bars and the inks.
