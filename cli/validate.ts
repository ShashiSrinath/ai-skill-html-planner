// oxlint-disable one-var, func-style, prefer-named-capture-group, init-declarations, id-length, curly, no-magic-numbers, no-continue, sort-keys, no-null, no-nested-ternary, no-ternary, prefer-destructuring, capitalized-comments, max-statements, no-misleading-character-class
import { Parser } from "htmlparser2";

export interface Violation {
  file: string;
  line: number;
  sev: "error" | "warn";
  msg: string;
}

const JSDELIVR = "cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v";
const PAGES_CSS = "shashisrinath.github.io/ai-skill-html-planner/dist/planner.min.css";
const PAGES_JS = "shashisrinath.github.io/ai-skill-html-planner/dist/planner.min.js";
const CSS_SUFFIX = "/dist/planner.min.css";
const JS_SUFFIX = "/dist/planner.min.js";

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
// Typographic characters that are allowed in prose and must not warn.
const ALLOWLIST_STRIP = /[–—''""…§¶•→⇒·×✓]/gu;

function isPlannerCss(href: string): boolean {
  return (href.includes(JSDELIVR) && href.includes(CSS_SUFFIX)) || href.includes(PAGES_CSS);
}

function isPlannerJs(src: string): boolean {
  return (src.includes(JSDELIVR) && src.includes(JS_SUFFIX)) || src.includes(PAGES_JS);
}

interface OpenEl {
  name: string;
  line: number;
  attrs: Record<string, string>;
  hasChild: boolean;
  hasText: boolean;
}

/**
 * Read a compiled (non-min) CSS file and return the set of `.class-name`
 * tokens it defines, excluding tokens introduced by pseudo-selectors
 * (e.g. `::file-selector-button`, `:hover`).
 */
export async function extractAllowlist(cssPath: string): Promise<Set<string>> {
  const source = await Bun.file(cssPath).text();
  const allowlist = new Set<string>();
  const re = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index > 0 && source[m.index - 1] === ":") continue;
    allowlist.add(m[1]);
  }
  return allowlist;
}

export async function validateFile(filePath: string): Promise<Violation[]> {
  const source = await Bun.file(filePath).text();
  const violations: Violation[] = [];
  const push = (line: number, sev: "error" | "warn", msg: string): void => {
    violations.push({ file: filePath, line, sev, msg });
  };

  // Position of each "\n" so a character index can be mapped to a line number.
  const newlines: number[] = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") newlines.push(i);
  }
  const lineAt = (index: number): number => {
    let lo = 0;
    let hi = newlines.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (newlines[mid] < index) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };

  let allowlist: Set<string> | null = null;
  try {
    allowlist = await extractAllowlist(new URL("../dist/planner.css", import.meta.url).pathname);
  } catch {
    push(1, "warn", "cannot read dist/planner.css (run bun run build)");
  }

  const classTokens = (attrs: Record<string, string>): string[] => {
    const cls = attrs.class;
    if (typeof cls !== "string" || cls.trim() === "") return [];
    return cls.split(/\s+/).filter((t) => t !== "");
  };

  const stack: OpenEl[] = [];
  let cssImported = false;
  let jsTagSeen = false;
  let incorrectJsLine = -1;

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        const line = lineAt(parser.startIndex);
        if (stack.length > 0) stack[0].hasChild = true;

        if (name === "link") {
          const href = attrs.href ?? "";
          if (isPlannerCss(href)) cssImported = true;
        } else if (name === "script") {
          const src = attrs.src ?? "";
          if (src !== "") {
            jsTagSeen = true;
            if (!isPlannerJs(src)) incorrectJsLine = line;
          }
        }

        if (attrs.style !== undefined) {
          push(line, "error", "inline style attribute (move to a class)");
        }
        if (name === "h1") {
          const inHero = stack.some((el) => classTokens(el.attrs).some((t) => t.includes("hero")));
          if (!inHero) push(line, "warn", "bare <h1> outside .hero");
        }
        if (name === "br") {
          const inPre = stack.some((el) => el.name === "pre");
          if (!inPre) push(line, "warn", "<br> outside <pre>");
        }
        if (allowlist !== null) {
          for (const token of classTokens(attrs)) {
            if (!allowlist.has(token) && !token.startsWith("pl-")) {
              push(line, "warn", `unknown class "${token}" (not in compiled CSS)`);
            }
          }
        }

        if (!VOID_ELEMENTS.has(name)) {
          stack.unshift({ name, line, attrs, hasChild: false, hasText: false });
        }
      },
      onclosetag(name, isImplied) {
        const closingLine = lineAt(parser.startIndex);
        // Void elements are never pushed onto the stack; ignore their closes.
        if (stack.length === 0 || VOID_ELEMENTS.has(name)) return;
        // An implied close (from an explicit end tag for a different element, or
        // from end of input) means the top element was never closed by its own
        // matching end tag — treat it as unclosed.
        if (stack[0].name !== name || isImplied) {
          const open = stack[0];
          push(closingLine, "error", `unclosed <${open.name}> tag (opened at line ${open.line})`);
          stack.shift();
          return;
        }
        const el = stack.shift();
        if (el !== undefined && el.name === "section" && !el.hasChild && !el.hasText) {
          push(el.line, "warn", "empty <section>");
        }
      },
      ontext(text) {
        if (stack.length > 0 && text.trim() !== "") stack[0].hasText = true;
        const line = lineAt(parser.startIndex);
        const stripped = text.replace(ALLOWLIST_STRIP, "");
        const m = EMOJI_RE.exec(stripped);
        if (m !== null) push(line, "warn", `emoji "${m[0]}" in text (use text or SVG marks)`);
      },
      onend() {
        for (const el of stack) {
          push(el.line, "error", `unclosed <${el.name}> tag (opened at line ${el.line})`);
        }
        if (!cssImported) {
          push(1, "error", "missing planner.css import");
        } else if (!jsTagSeen) {
          push(1, "error", "missing planner.js import");
        }
        if (incorrectJsLine > 0) {
          push(incorrectJsLine, "error", "incorrect planner.js import URL");
        }
      },
    },
    { xmlMode: false, recognizeSelfClosing: true },
  );

  parser.write(source);
  parser.end();

  violations.sort((a, b) => a.line - b.line || (a.sev === b.sev ? 0 : a.sev === "error" ? -1 : 1));
  return violations;
}
