---
name: plan-with-html
description: Use when asked to plan, design, or document with HTML; when the user wants a plan, ADR, retrospective, or design document as a browsable HTML document; when a document should be rendered professionally in the browser. Triggers on "html plan", "plan as html", "write me a design doc", "ADR", "retro".
---

## Import contract

Every document must import the design system via these exact pinned CDN lines, verbatim:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.3.0/dist/planner.min.css">
<script defer src="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.3.0/dist/planner.min.js"></script>
```

- Never inline styles.
- Never invent classes.
- Never change the tag without the user's say-so.

The tag is immutable — exact tag always, no `@main`, no ranges. Old docs keep rendering forever because tags are pinned to immutable snapshots. Docs need network to render; the accepted offline escape hatch is `planner bundle` (details in Fallbacks).

## Mandatory workflow

1. `planner new plan|adr|retro` — scaffold from template.
2. Write content from the template.
3. `planner fmt` — optional normalization.
4. `planner validate` — check the document.
5. Fix every violation.
6. Re-validate — MUST be clean.
7. `planner open` — hand the document to the human in the default browser. This is the FINAL step.

The workflow ends at `planner open`. Verification of the rendered document is NOT part of the loop: no browser-tool verification, no screenshots, no DOM inspection of the rendered output. The document is handed to the human at `planner open`; the validate step is the quality gate.

The validate loop is NOT optional; it is the quality mechanism. Exit-code note: `validate` exits 1 on errors, 0 on warnings-only (warnings should still be fixed when sensible, but errors block).

## Core class cheat-sheet

- `.hero` (+ `.kicker`, `.lede`, `.meta`) — doc masthead: tiny uppercase accent label, h1, 2–3-line summary, status/date/author line
- `.badge[data-tone=ok|warn|danger|info]` — status pills (effort/size chips like S/M/L or P0-P2 reuse `.badge` directly — no separate chip class)
- `.callout[data-kind=note|warn|decision|question]` — left-accented boxes: decisions made, open questions
- `.steps` / `.timeline` — ordered phases with a connecting rule
- `.flow` — linear/branching step diagram; `.arch` (+ `.arch-node`, `.arch-arrow[data-dir=right|left|both]`) — box-and-connector architecture diagram
- `.grid` + `.card` — 2–3 column summary cards
- `pre[data-file]` — code block with filename header + copy button
- `.check` — task checklist with square SVG markers
- `.chart-bar` / `.chart-line` — inline-SVG bar chart / sparkline; marks take `data-series="1"`..`"8"` in the fixed validated color order (blue, orange, aqua, yellow, magenta, green, violet, red) — never reorder or skip a slot; pair every chart with a `<details>` table-view fallback

```html
<section class="hero">
  <p class="kicker">Design Doc</p>
  <h1>Title</h1>
  <p class="lede">Summary</p>
</section>
```

Runtime behaviors needing no markup: smooth anchor/TOC scrolling (respects `prefers-reduced-motion`), a hover-reveal `#` permalink on every heading in a doc with `nav.pl-toc`, and an automatic "Back to top" link in docs without one. `figure`/`figcaption` render styled with zero classes.

Reference classes (see README): `.stat`, `.filetree`, `.decision`, `.matrix`, `.toc`, `.footer`, `.muted`, `.small`, `.lead`, `.quote`, `.avoid`, `.two-col` — full docs in the repo README.

## Prose rules

No emoji; no hype copy ("unleash", "seamless", "robust" as filler); concrete language; doc structure mirrors the plan's real phases. Semantic HTML: h2/h3 auto-number via CSS counters — never hand-write numbers in headings.

## Fallbacks

Browser unavailable → report cleanly; `planner open` is best-effort; offline → suggest `planner bundle` for a self-contained offline file.

Even plain semantic HTML (`h2`, `p`, `ul`, `table`, `blockquote`, `pre`) renders well with no classes — classes are polish, not prerequisites. `validate` warns on unknown classes; the allowlist is extracted from the compiled CSS, so it is self-maintaining.
