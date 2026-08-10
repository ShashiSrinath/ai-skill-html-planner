// oxlint-disable max-statements, one-var, func-style, no-magic-numbers, no-null, no-ternary, id-length, no-continue
import { ALLOWLIST } from "./allowlist.generated.ts";

const usedIds = new Set<string>();
const copyTimers = new WeakMap<HTMLElement, number>();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nextId(base: string): string {
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function buildToc(): HTMLElement | null {
  const nav = document.querySelector("nav.pl-toc");
  if (nav === null) {
    return null;
  }
  const headings = [...document.querySelectorAll("h2, h3")].filter(
    (el) => el.closest(".hero") === null && (el.textContent?.trim() ?? "") !== "",
  );
  if (headings.length === 0) {
    return;
  }

  const root = document.createElement("ul");
  let lastH2Li: HTMLLIElement | null = null;

  for (const heading of headings) {
    const text = heading.textContent?.trim() ?? "";
    const base = (heading.id.trim() !== "" ? heading.id : slugify(text)) || "section";
    const id = nextId(base);
    heading.id = id;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = text;
    li.append(a);

    if (heading.tagName === "H3" && lastH2Li !== null) {
      let nested = lastH2Li.querySelector(":scope > ul");
      if (nested === null) {
        nested = document.createElement("ul");
        lastH2Li.append(nested);
      }
      nested.append(li);
    } else {
      root.append(li);
      if (heading.tagName === "H2") {
        lastH2Li = li;
      }
    }
  }

  nav.replaceChildren(root);
  return nav;
}

function buildScrollSpy(nav: HTMLElement): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const a of nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")) {
    links.set(a.getAttribute("href") ?? "", a);
  }
  const targets = [...links.keys()]
    .map((href) => document.getElementById(href.slice(1)))
    .filter((el): el is HTMLElement => el !== null);

  const setActive = (href: string): void => {
    for (const [key, a] of links) {
      const on = key === href;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActive(`#${entry.target.id}`);
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
  );
  for (const target of targets) observer.observe(target);
  if (targets.length > 0) setActive(`#${targets[0].id}`);
}

function fallbackCopy(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.append(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

function showCopied(button: HTMLButtonElement): void {
  const pending = copyTimers.get(button);
  if (pending !== undefined) {
    globalThis.clearTimeout(pending);
  }
  button.textContent = "Copied";
  copyTimers.set(
    button,
    globalThis.setTimeout(() => {
      button.textContent = "Copy";
    }, 1500),
  );
}

async function copyCode(pre: HTMLPreElement, button: HTMLButtonElement): Promise<void> {
  const code = pre.textContent ?? "";
  let ok = false;
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    fallbackCopy(code);
  }
  showCopied(button);
}

function addCopyButtons(): void {
  for (const pre of document.querySelectorAll<HTMLPreElement>("pre[data-file]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pl-copy";
    button.setAttribute("aria-label", "Copy code");
    button.textContent = "Copy";
    button.style.position = "absolute";
    button.style.top = "0";
    button.style.right = "0";
    if (getComputedStyle(pre).position === "static") {
      pre.style.position = "relative";
    }
    button.addEventListener("click", () => {
      void copyCode(pre, button);
    });
    pre.append(button);
  }
}

function lintClasses(): void {
  const allowlist = new Set(ALLOWLIST);
  for (const el of document.querySelectorAll("*")) {
    for (const token of el.classList) {
      if (token.startsWith("pl-") || allowlist.has(token)) {
        continue;
      }
      console.warn(`[planner] unknown class "${token}" (not in compiled CSS)`);
    }
  }
}

function init(): void {
  const nav = buildToc();
  if (nav !== null) {
    buildScrollSpy(nav);
  }
  addCopyButtons();
  lintClasses();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
