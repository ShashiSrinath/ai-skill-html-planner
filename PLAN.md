# ai-skill-html-planner — Implementation Plan

**Status:** Plan (v3) · **Date:** 2026-08-10 · **Owner:** Shashi Srinath

A public design system for AI-authored HTML documents. Agents (LLMs) write
planning docs, ADRs, and retros as minimal semantic HTML + a small set of
`pl-*` classes; a versioned, CI-built stylesheet renders them as professional,
human-readable documents in the default browser. Everything is public, built
by real CI, and distributed as a pinned CDN URL — no local file serving, no
copies of the runtime anywhere.

---

## 1. Goals & non-goals

**Goals**
- Agents can produce beautiful docs with *zero design decisions*: they fill in
  structure, never style.
- One canonical runtime, built and versioned by CI on a public repo, consumed
  by a single pinned URL per version. Old docs never break.
- The skill ("plan-with-html") is a thin adapter: a contract (SKILL.md) + one
  auto-syncing wrapper. The repo owns all rules, templates, and tooling.
- Batteries included, minimal hand-rolled code: Bun + Vite + Tailwind v4 do
  the heavy lifting; our code is the design system itself, not build glue.
- Design output reads *professional*: warm-paper light theme, automatic dark
  mode, system fonts, one sober accent, hairline borders, print stylesheet.
  No gradients, no glow, no emoji, no "AI slop".

**Non-goals (v1)**
- No local runtime copies (`init` mode is dropped — CDN is the contract).
- No npm publish in v1 (jsDelivr `gh` mode covers distribution; npm can come
  later if wanted).
- No JS frameworks in docs; runtime JS stays tiny (TOC + copy + lint).
- No user-facing design customization. Version bumps are the customization.

---

## 2. Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│  GitHub: ShashiSrinath/     │  CI    │  jsDelivr (gh mode, pinned @tag)     │
│  ai-skill-html-planner      │ ─────▶ │  https://cdn.jsdelivr.net/gh/<owner>/ │
│                             │        │  ai-skill-html-planner@v0.1.0/dist/…  │
│  src/*.css (Tailwind v4)    │  tag   │                                      │
│  src/cli/*.ts (validate…)   │ ─────▶ │  GitHub Pages (mirror + style guide)  │
│  templates/, site/          │  push  │  https://shashisrinath.github.io/     │
│  dist/ (committed)          │        │  ai-skill-html-planner/               │
└─────────────────────────────┘        └──────────────────────────────────────┘
        ▲                                            │
        │ git clone (cached, auto-update)            ▼
┌───────┴──────────────────┐        ┌──────────────────────────────────────┐
│  Skill: ~/.config/       │        │  Generated docs (anywhere on disk):   │
│  opencode/skills/        │  runs  │  minimal HTML + pl-* classes + 2      │
│  plan-with-html/         │ ─────▶ │  pinned <link>/<script> tags          │
│  SKILL.md + bin/planner  │        │  Opened via file:// in default browser│
└──────────────────────────┘        └──────────────────────────────────────┘
```

**Import contract** (written into every generated doc, exactly as-is):

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.1.0/dist/planner.min.css">
<script defer
        src="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.1.0/dist/planner.min.js"></script>
```

- **Exact tag, always.** No `@main`, no ranges. Tag → immutable snapshot.
- Mirror fallback: `https://shashisrinath.github.io/ai-skill-html-planner/dist/…`
  (same bytes; used by `bundle` and as a documented manual fallback).
- Docs need network to render. `planner bundle` produces a fully self-contained
  offline copy — the accepted escape hatch for sharing/sending/archiving.

---

## 3. Repo layout

```
/home/shashi/Dev/Personal/ai-skill-html-planner/
├── package.json              # type: module; scripts: build / validate / dev
├── tsconfig.json
├── vite.config.ts            # @tailwindcss/vite; stable dist filenames
├── .oxfmtrc.json             # oxfmt: print width etc. (HTML via bundled Prettier)
├── .oxlintrc.json            # oxlint: correctness=error, perf/style=warn
├── .github/workflows/ci.yml
├── src/
│   ├── planner.css           # entry: @import "tailwindcss" + @theme tokens
│   ├── base.css              # semantic-HTML baseline (zero classes = good)
│   ├── components.css        # pl-* classes (hero, callout, steps, card…)
│   ├── dark.css              # prefers-color-scheme overrides
│   ├── print.css
│   └── runtime/
│       ├── main.ts           # TOC + copy buttons + class lint (bundled)
├── cli/
│   ├── planner.ts            # shebang #!/usr/bin/env bun — the `planner` CLI
│   └── validate.ts           # rules engine (htmlparser2)
├── templates/
│   ├── plan.html             # complete, filled-in examples — also CI fixtures
│   ├── adr.html
│   └── retro.html
├── site/                     # style-guide/demo site → GitHub Pages root
│   ├── index.html            # live showcase of every class (passes validate)
├── dist/                     # COMMITTED build output (jsDelivr serves tags)
│   ├── planner.css / planner.min.css
│   └── planner.js / planner.min.js
├── examples/                 # 2–3 showcase docs, validated by CI
└── README.md                 # import contract, versioning ritual, CLI docs
```

---

## 4. Toolchain — why Bun + Vite + Tailwind v4

| Tool | Role | Why |
|---|---|---|
| **Bun 1.4** | Runtime + package manager + CLI runner | Single binary, `bun install`/`bun run`/`bunx` — replaces npm/node/python glue. `planner` CLI is one `#!/usr/bin/env bun` TS file, no compile step. |
| **Vite 6** | CSS/JS bundler | Zero-config `bunx vite build`; minification + stable output names; `@tailwindcss/vite` plugin does the whole Tailwind pipeline (no PostCSS config needed in v4). |
| **Tailwind v4** | CSS authoring foundation | CSS-first `@theme` tokens; our design tokens *are* Tailwind tokens (`--color-ink`, `--font-sans`), compiled once at build time. Gives us `dark:`/`print:` variants and a utility layer for free. |
| **oxlint** | Linter (Rust, oxc family) | Catches real bugs in our TS CLI/runtime: `correctness` as errors, `perf`/`style` as warnings, all warnings denied in CI. `-f unix` output, `.oxlintrc.json` config. |
| **oxfmt** | Formatter (Rust, oxc family) | CSS/TS/JSON formatted natively (Rust); HTML via its bundled Prettier engine (no separate install). `--check` mode = the CI formatting gate. One formatter for every file type in the repo. |

**Critical division of labor:** Tailwind is the *authoring tool* for the design
system, **never** the API exposed to agents. Docs must not contain raw
utilities like `class="flex gap-2"` — the agent-facing surface is only
semantic HTML + `pl-*` component classes. Tailwind's output is compiled into
`planner.min.css`; agents consume the result.

**Exact deps:** `bun i -d` → `vite`, `tailwindcss`, `@tailwindcss/vite`,
`typescript`, `htmlparser2` (validate), `oxlint`, `oxfmt`, `@types/node`.
That's the whole list.

---

## 5. Design system spec (the product)

### 5.1 Design tokens (`src/planner.css` → `@theme`)

| Token | Light | Dark (auto) |
|---|---|---|
| `--color-paper` (bg) | `#fbfaf8` warm paper | `#191919` |
| `--color-surface` | `#ffffff` | `#212121` |
| `--color-ink` | `#1a1a1a` | `#e8e6e3` |
| `--color-muted` | `#6b6864` | `#a3a09b` |
| `--color-hairline` | `#e5e2dd` | `#333` |
| `--color-accent` (teal, single sober accent) | `#0f766e` | `#5eead4` |
| `--color-ok` / `--color-warn` / `--color-danger` | `#15803d` / `#b45309` / `#b91c1c` | dimmed variants |
| `--font-sans` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` | |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` | |

No webfonts (offline-clean, and avoids the default AI look). Radius cap 8px.

### 5.2 Typography & layout

- Base 16px / 1.6 line-height; body copy `max-width: 72ch`.
- `h1` 2.2rem / 700 / −0.02em tracking; `h2` 1.5rem / 650 with hairline top
  border — sections read as discrete blocks; `h3` 1.15rem / 600.
- **Auto section numbering via CSS counters** (`h2` → `1.` `2.`, `h3` → `1.1`):
  agents never hand-write numbers.
- Inline `code` mono 0.9em on `#f4f4f5` chip; `kbd` with subtle key-style.
- Hairline borders + whitespace throughout. Selection and focus rings accent.

### 5.3 Components (`pl-*` classes)

**Core set — documented in the cheat-sheet, agents reach for these:**

| Class | Purpose |
|---|---|
| `.hero` (+ `.kicker`, `.lede`, `.meta`) | Doc masthead: tiny uppercase accent label, h1, 2–3-line summary, status badge / date / author line |
| `.badge[data-tone=ok|warn|danger|info]` | Status pills |
| `.callout[data-kind=note|warn|decision|question]` | Left-accented boxes: decisions made, open questions |
| `.steps` / `.timeline` | Ordered phases with a connecting rule |
| `.grid` + `.card` | 2–3 column summary cards |
| `pre[data-file]` | Code block with filename header + copy button |
| `.check` | Task checklist with square SVG markers |

**Reference set — appendix only, documented lower-salience:** `.stat`,
`.filetree` (details/summary repo tree), `.decision` (dl-based decision
table), `.toc`, `.footer`, `.grid--2/3/4`, `.muted`, `.small`, `.lead`,
`.quote`, `.avoid` (things-not-to-do), `.two-col`.

**Zero-class baseline:** plain `<h2>`, `<p>`, `<ul>`, `<table>`,
`<blockquote>`, `<pre>` all render correctly with no classes. This is the
anti-slop insurance: even an agent that ignores every class produces a decent
document.

### 5.4 JS runtime (bundled to `planner.min.js`, classic script)

Exactly three behaviors — nothing more (ES modules break on `file://`):
1. **Auto-TOC** from `h2`/`h3` into `nav.pl-toc` if present; scroll-margin anchors.
2. **Copy buttons** on `pre[data-file]`, with no-JS `<details>` fallback.
3. **Console lint:** `console.warn` for any class not present in the compiled
   CSS (agents self-correct; the allowlist is derived from `dist/planner.css`).

---

## 6. Quality gates — validate, lint, format

Three layers, all enforced in CI and locally, all Rust-speed via the oxc
family:

| Gate | Tool | Scope | CI behavior |
|---|---|---|---|
| Design rules | `cli/validate.ts` (htmlparser2) | Generated docs + repo's own templates/examples/site | Errors exit ≠ 0 |
| Code lint | `oxlint` | Our TS (CLI, runtime) | `--deny-warnings` + `-f unix` |
| Formatting | `oxfmt --check` | CSS/TS/JSON (native) + HTML (bundled Prettier) | Exit ≠ 0 if unformatted |

`dist/` is excluded from oxfmt (minified build output); its freshness is
guaranteed by the separate rebuild-diff check in CI.

### 6.1 Design rules (`planner validate`) — the doc quality gate

Machine-parseable output so agents can self-correct in a loop:

```
plan.html:14: warn:  unknown class "fancy-box" (not in compiled CSS; did you mean .callout?)
plan.html:3:  error: missing planner.css import
plan.html:47: error: inline style attribute (move to a class)
plan.html:9:  warn:  emoji "🚀" in heading (use text or SVG marks)
plan.html:22: error: unclosed <section> tag
```

| Severity | Rule |
|---|---|
| error | Missing/incorrect runtime import (URL not matching pinned pattern) |
| error | Inline `style=` attributes |
| error | Unclosed tags / malformed HTML |
| warn | Class not in compiled CSS allowlist (self-maintaining: extracted from `dist/planner.css`) |
| warn | Emoji in text (beyond a tiny ASCII-safe allowlist) |
| warn | Bare `<h1>` outside `.hero`; `<br>` misuse; empty sections |

- Exit non-zero on any `error`. CI runs validate against `templates/`,
  `examples/`, `site/` — **the system itself must pass its own rules**.
- Implemented in `cli/validate.ts` with `htmlparser2` (fast, no browser).

---

## 7. CLI — `planner` (Bun, lives in repo, versioned with the CSS)

```
planner new plan|adr|retro [-o doc.html]   # scaffold from repo templates
planner validate <doc>                      # rules engine; exit ≠0 on error
planner open <doc>                          # xdg-open / open / start
planner bundle <doc>                        # inline CDN css+js → <doc>.standalone.html
planner fmt <doc>                           # oxfmt the doc (consistency before validate)
```

- `new`: copies a template; agent fills content. Templates are the guardrail.
- `bundle`: fetches css/js from jsDelivr (Pages URL as fallback) and inlines
  them, stripping the import tags → one portable, offline file.
- The skill's `bin/planner` is a ~15-line bash wrapper: fetch/update the
  cached clone (`~/.cache/ai-skill-html-planner`, `--depth 1`) then
  `exec bun run cli/planner.ts "$@"`. Auto-updating, zero duplication.

---

## 8. CI pipeline & release ritual

`.github/workflows/ci.yml`, three jobs on the same workflow:

1. **Build** — `bun install` → `bun run build` (Vite: `src/planner.css` +
   `src/runtime/main.ts` → `dist/` with stable names + min files; version
   banner `/* ai-skill-html-planner vX.Y.Z */` injected).
2. **Gate** — `bun run ci` (one script, four checks):
   - `oxlint . --deny-warnings -f unix` — our TS must be clean, zero warnings
   - `oxfmt --check src cli templates site` — zero formatting drift
   - `bun run validate` against `templates/`, `examples/`, `site/`
   - rebuild + `git diff --exit-code dist` — stale committed `dist/` fails CI

   A red CI is the anti-slop guarantee: the repo's own docs must pass every
   gate that agent docs are held to, plus the code-quality gates.
3. **Deploy** — on `main` push: GitHub Pages (official `configure-pages` /
   `upload-pages-artifact` / `deploy-pages` actions) serving `site/` + `dist/`.
   On `v*` tag: create GitHub Release with the `dist/` + templates tarball.

**Release ritual** (documented in README): bump version in `package.json` →
`bun run build` (dist committed by the freshness gate) → `git tag v0.1.0` →
push tag → bump the pinned version line in SKILL.md (one line). Old docs keep
rendering from their pinned tag forever.

**URLs that must work post-tag:**
- `https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.1.0/dist/planner.min.css`
- `https://shashisrinath.github.io/ai-skill-html-planner/dist/planner.min.css`
- Style guide: `https://shashisrinath.github.io/ai-skill-html-planner/`

---

## 9. The skill (`plan-with-html`)

```
~/.config/opencode/skills/plan-with-html/
├── SKILL.md      # the agent contract
└── bin/planner   # wrapper → cached repo clone → bun CLI
```

**SKILL.md frontmatter:** `name: plan-with-html`; description front-loads
triggers: "Use when asked to plan, design, or document with HTML; when the
user wants a plan/ADR/retro as a browsable HTML document…"

**SKILL.md body (in order):**
1. **Import contract** — the exact pinned CDN lines; rules: never inline
   styles, never invent classes, never change the tag without the user's say-so.
2. **Mandatory workflow** — `planner new` → write from template → `planner
   fmt` (optional normalization) → `planner validate` → fix every violation →
   re-validate (must be clean) → `planner open`. The validate loop is not
   optional; it is the quality mechanism.
3. **Core class cheat-sheet** — the 7 core classes with one-line usage + a
   3-line minimal example inline. Reference classes mentioned as "see README".
4. **Prose rules** — no emoji, no hype copy ("unleash", "seamless"), concrete
   language; doc structure mirrors the plan's real phases.
5. **Fallbacks** — browser unavailable → report cleanly; `open` is
   best-effort; offline → suggest `planner bundle`.

---

## 10. Templates & examples

- **`plan.html`** — hero (kicker "FEATURE PLAN", lede, meta: status/date),
  context & problem, goals grid, implementation `.steps`, decision callouts,
  open questions, file tree, code blocks with filenames, checklist, footer.
- **`adr.html`** — status badge, context, decision, consequences, `.decision`
  table (alternatives + tradeoffs), revision history.
- **`retro.html`** — hero, `.stat` row (what went well / went wrong / metrics),
  timeline of events, `.callout` learnings, action-item checklist.
- Each is a **complete filled-in example** (agent diffs against it, never
  restyles it), passes `planner validate`, and doubles as a CI fixture.
- `site/index.html` + `examples/` — the living style guide and showcase docs,
  served publicly on Pages. They demonstrate the design system to humans and
  pin its quality in CI.

---

## 11. Milestones & rollout

| # | Milestone | Exit criterion |
|---|---|---|
| M1 | Scaffold: git init, `bun init`, Vite + Tailwind v4 wired, `@theme` tokens, oxfmt + oxlint configured | `bun run build` emits `dist/planner.css`; `bunx oxfmt --check` and `bunx oxlint` pass on scaffold |
| M2 | Design system CSS: base → components → dark → print | Browser checkpoint: zero-class doc + each core class looks right, light/dark/print |
| M3 | JS runtime (TOC, copy, console lint) bundled | Works over `file://` in Chromium & Firefox |
| M4 | `planner` CLI: validate first, then new/open/bundle | Every rule triggers with parseable output; exit codes correct |
| M5 | Templates ×3 + examples + site style guide, all passing validate | `bun run validate` clean on the repo itself |
| M6 | CI: build → gates (lint/fmt/validate/freshness) → Pages → release; cut `v0.1.0` | Both CDN URLs + style guide load; stale-dist, oxlint, and oxfmt violations fail CI |
| M7 | Skill: SKILL.md + wrapper | Full agent loop works end-to-end (`new` → edit → `validate` → `open`) |
| M8 | Polish: README, LICENSE (MIT), a11y pass, print tweaks | Done |

**Verification checklist**
- [ ] Zero-class HTML doc renders well (the anti-slop test)
- [ ] `planner validate` catches every rule; output is `file:line: sev: msg`
- [ ] Dark mode + print stylesheet correct in both browsers
- [ ] Doc pinned to `v0.1.0` still renders after `v0.2.0` is released
- [ ] `planner bundle` output opens offline, zero network
- [ ] CI fails on stale dist, oxlint violations, oxfmt drift, and template violations; passes otherwise
- [ ] oxfmt formats HTML templates via bundled Prettier under Bun (fallback: `node`)
- [ ] Skill triggers correctly; loop completes without manual steps

---

## 12. Decisions already made (and why)

| Decision | Choice | Rationale |
|---|---|---|
| Distribution | CDN (jsDelivr gh mode) + Pages mirror | No local serving, no npm account; tags = immutable versions |
| dist committed | Yes | jsDelivr serves from git tags; freshness gate enforces it |
| Dark mode | Automatic via `prefers-color-scheme` | Docs are static; no toggle needed |
| Fonts | System stack | Offline-safe, professional, not "webfont AI look" |
| Agent API | Semantic HTML + 7 core `pl-*` classes | Small surface = less slop; zero-class baseline as safety net |
| Templates | 3, complete examples | Guardrail against drift; also CI fixtures |
| Validate | Mandatory loop in SKILL.md + CI on repo | The mechanism that keeps output professional |
| Tooling | Bun + Vite + Tailwind v4 | Zero hand-rolled build glue; our code = design, not plumbing |
| Tailwind exposure | Never exposed to agents | Design system's authoring tool only |
| npm publish | v1: no (jsDelivr gh is enough) | Unblocks everything without an npm account |
| Code quality | oxlint + oxfmt (oxc family) | Same Rust-speed ecosystem as Bun; native CSS/TS/JSON + bundled-Prettier HTML = one formatter, one linter for the whole repo |
| Offline docs | `planner bundle` escape hatch | Accepted trade-off for the CDN contract |
