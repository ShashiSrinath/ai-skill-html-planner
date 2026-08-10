# ai-skill-html-planner

A public design system for AI-authored HTML documents. Agents (LLMs) write
planning docs, ADRs, and retros as minimal semantic HTML plus a small set of
`pl-*` classes; a versioned, CI-built stylesheet renders them as professional,
human-readable documents in the default browser.

Everything is distributed as a pinned CDN URL — no local file serving, no
copies of the runtime anywhere. Each version is an immutable snapshot, so old
docs never break: a doc pinned to `v0.1.0` keeps rendering exactly as it did
the day it was written, even after newer versions ship.

## Import contract

Every generated doc carries exactly these two tags, verbatim:

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.2.0/dist/planner.min.css">
<script defer
        src="https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v0.2.0/dist/planner.min.js"></script>
```

- **Exact tag, always.** No `@main`, no ranges. A tag is an immutable snapshot.
- **Mirror fallback:** `https://shashisrinath.github.io/ai-skill-html-planner/dist/…`
  serves the same bytes and is the documented manual fallback.
- **Docs need network to render.** `planner bundle` produces a fully
  self-contained offline copy — the accepted escape hatch for sharing,
  sending, or archiving.

## Quick start

The 30-second path:

1. `planner new plan` — scaffold from the repo template.
2. Fill in the content.
3. `planner validate` — run the design rules.
4. Fix every violation.
5. Re-validate — must be clean, zero violations.
6. `planner open` — view it in your default browser.

The validate loop is mandatory. It is the quality mechanism that keeps output
professional.

## CLI reference

```
planner new plan|adr|retro [-o doc.html]   # scaffold from repo templates
planner validate <doc|dir> [...]           # design rules; exit !=0 on error
planner open <doc>                          # open in default browser
planner bundle <doc>                        # inline CDN css+js → <doc>.standalone.html
planner fmt <doc>                           # format with oxfmt
```

`planner` comes from the plan-with-html skill wrapper
(`~/.config/opencode/skills/plan-with-html/bin/planner` → cached clone → bun
CLI); or run it in-repo with `bun cli/planner.ts <cmd>`.

## Installing the skill

The `plan-with-html` skill ships with this repository at
`.opencode/skills/plan-with-html/` — the repo is the canonical copy and the
source of truth; any global install is a synced copy.

**Option A — project scope (zero setup):** open opencode in this repository.
Project skills auto-load from `.opencode/skills/`, so `plan-with-html` is
available immediately.

**Option B — global scope (copy):** copy the folder into your global skills
directory:

```
cp -r .opencode/skills/plan-with-html ~/.config/opencode/skills/
```

(macOS/Linux; on Windows point at the equivalent config dir). The skill is
then available in every project.

**Option C — global scope (no copy):** add the repo's skills dir to
`~/.config/opencode/opencode.json`:

```json
{ "skills": { "paths": ["/path/to/this/repo/.opencode/skills"] } }
```

The skill loads straight from the repo — no copy to keep in sync.

After installing (or changing a skill), restart opencode — config and skill
changes require a restart to take effect.

`bin/planner` needs [bun](https://bun.sh); on first run it clones the repo to
`~/.cache/ai-skill-html-planner` and auto-updates on subsequent runs.

## The design system

### Core classes

| Class | Purpose |
|---|---|
| `.hero` (+ `.kicker`, `.lede`, `.meta`) | Doc masthead: tiny uppercase accent label, h1, 2–3-line summary, status badge / date / author line |
| `.badge[data-tone=ok\|warn\|danger\|info]` | Status pills |
| `.callout[data-kind=note\|warn\|decision\|question]` | Left-accented boxes: decisions made, open questions |
| `.steps` / `.timeline` | Ordered phases with a connecting rule |
| `.grid` + `.card` | 2–3 column summary cards |
| `pre[data-file]` | Code block with filename header + copy button |
| `.check` | Task checklist with square SVG markers |

### Reference set

`.stat`, `.filetree`, `.decision`, `.toc`, `.footer`, `.grid--2/3/4`,
`.muted`, `.small`, `.lead`, `.quote`, `.avoid`, `.two-col`, `.is-active`.

### Sticky sidebar

`nav.pl-toc` becomes a sticky left sidebar on wide screens (≥1024px) via
`body:has(nav.pl-toc)`. The runtime adds an `is-active` class plus
`aria-current` to the section currently in view (scroll-spy highlight). On
narrow screens it collapses to an in-flow box at the top. It requires zero new
markup — the existing `nav` element is used as-is.

### Zero-class baseline

Plain `<h2>`, `<p>`, `<ul>`, `<table>`, `<blockquote>`, `<pre>` all render
correctly with no classes. This is the anti-slop insurance: even an agent that
ignores every class produces a decent document.

No raw Tailwind utilities in docs. The agent-facing surface is only semantic
HTML plus `pl-*` classes — Tailwind is the design system's authoring tool,
never its API.

## Quality gates

`planner validate` enforces the design rules:

| Severity | Rule |
|---|---|
| error | Missing/incorrect runtime import (URL not matching pinned pattern) |
| error | Inline `style=` attributes |
| error | Unclosed tags / malformed HTML |
| warn | Class not in compiled CSS allowlist |
| warn | Emoji in text |
| warn | Bare `<h1>` outside `.hero`; `<br>` misuse; empty sections |

Beyond validate, CI enforces `oxlint --deny-warnings`, `oxfmt --check`, and
dist freshness (rebuild + `git diff --exit-code dist`). The repo's own docs
must pass every gate that agent docs are held to.

## Versioning & release ritual

1. Bump the version in `package.json`.
2. `bun run build` — dist is committed; the freshness gate enforces it.
3. `git tag v0.1.0`.
4. Push the tag.
5. Bump the pinned version line in `.opencode/skills/plan-with-html/SKILL.md` (one line) — the repo copy is canonical; re-copy the folder to `~/.config/opencode/skills/` to sync the global copy.

Old docs keep rendering from their pinned tag forever.

## Repo layout

```
├── package.json              # type: module; scripts: build / validate / dev
├── src/                      # planner.css, base.css, components.css, dark.css, print.css, runtime/main.ts
├── cli/                      # planner.ts (the `planner` CLI), validate.ts (rules engine)
├── templates/                # plan.html, adr.html, retro.html — complete examples, CI fixtures
├── site/                     # style-guide/demo site → GitHub Pages root
├── dist/                     # COMMITTED build output (jsDelivr serves tags)
├── examples/                 # showcase docs, validated by CI
└── README.md
```

## Development

- `bun install` — install dependencies.
- `bun run build` — build `dist/` with Vite.
- `bun run ci` — one script, four checks: `oxlint --deny-warnings`,
  `oxfmt --check src cli templates site`, validate `templates examples site`,
  and rebuild + `git diff --exit-code dist`.
- `bun run dev` — watch build.

## License

MIT. See [LICENSE](LICENSE).
