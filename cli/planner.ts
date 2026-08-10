#!/usr/bin/env bun
// oxlint-disable one-var, func-style, prefer-named-capture-group, init-declarations, id-length, curly, no-magic-numbers, no-continue, sort-keys, no-null, no-nested-ternary, no-ternary, prefer-destructuring, capitalized-comments, max-statements, no-misleading-character-class, no-await-in-loop
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { validateFile } from "./validate.ts";

const VERSION = "0.1.0";

const JSDELIVR = `https://cdn.jsdelivr.net/gh/ShashiSrinath/ai-skill-html-planner@v${VERSION}/dist/`;
const PAGES = "https://shashisrinath.github.io/ai-skill-html-planner/dist/";
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".worktrees"]);

function printUsage(): void {
  console.log(`planner — ai-skill-html-planner CLI (v${VERSION})

usage: planner <command> [args]

commands:
  new plan|adr|retro [-o doc.html]   scaffold a doc from a repo template
  validate <doc|dir> [...]           run the design rules; exit !=0 on error
  open <doc>                         open a doc in the default browser
  bundle <doc>                       inline CDN css+js into a standalone file
  fmt <doc>                          format a doc with oxfmt`);
}

function collectHtmlFiles(path: string, out: string[]): void {
  const st = statSync(path);
  if (st.isFile()) {
    if (path.endsWith(".html")) out.push(path);
    return;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    collectHtmlFiles(join(path, entry), out);
  }
}

async function cmdNew(args: string[]): Promise<void> {
  const type = args[0];
  if (type === undefined) {
    console.error("usage: planner new plan|adr|retro [-o doc.html]");
    process.exit(2);
  }
  const templateUrl = new URL(`../templates/${type}.html`, import.meta.url);
  if (!(await Bun.file(templateUrl).exists())) {
    console.error(`error: template "${type}" not found (templates land in P5; expected)`);
    process.exit(1);
  }
  let out = `${type}.html`;
  const oIdx = args.indexOf("-o");
  if (oIdx !== -1 && args[oIdx + 1] !== undefined) out = args[oIdx + 1];
  await Bun.write(out, Bun.file(templateUrl));
  console.log(
    `created ${out} — write content, then: bun cli/planner.ts validate ${out} && bun cli/planner.ts open ${out}`,
  );
}

async function cmdValidate(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("usage: planner validate <doc|dir> [...]");
    process.exit(2);
  }
  const files: string[] = [];
  for (const p of args) {
    let st;
    try {
      st = statSync(p);
    } catch {
      console.error(`warn: path not found: ${p}`);
      continue;
    }
    if (st.isDirectory()) collectHtmlFiles(p, files);
    else if (st.isFile()) files.push(p);
  }
  let errors = 0;
  let warns = 0;
  for (const file of files) {
    const violations = await validateFile(file);
    for (const v of violations) {
      const sev = v.sev === "error" ? "error" : "warn ";
      console.log(`${v.file}:${v.line}: ${sev}: ${v.msg}`);
      if (v.sev === "error") errors++;
      else warns++;
    }
  }
  console.error(`${errors} error(s), ${warns} warning(s) in ${files.length} file(s)`);
  process.exit(errors > 0 ? 1 : 0);
}

async function cmdOpen(args: string[]): Promise<void> {
  const doc = args[0];
  if (doc === undefined) {
    console.error("usage: planner open <doc>");
    process.exit(2);
  }
  const abs = resolve(doc);
  if (!existsSync(abs)) {
    console.error(`error: file not found: ${doc}`);
    process.exit(1);
  }
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const child = spawn(opener, [abs], { detached: true, stdio: "ignore" });
  child.on("error", () => {
    console.warn("no browser opener found (xdg-open missing)");
    process.exit(0);
  });
  child.on("spawn", () => {
    child.unref();
  });
}

async function fetchAsset(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function cmdBundle(args: string[]): Promise<void> {
  const doc = args[0];
  if (doc === undefined) {
    console.error("usage: planner bundle <doc>");
    process.exit(2);
  }
  if (!existsSync(resolve(doc))) {
    console.error(`error: file not found: ${doc}`);
    process.exit(1);
  }
  let css = await fetchAsset(`${JSDELIVR}planner.min.css`);
  if (css === null) css = await fetchAsset(`${PAGES}planner.min.css`);
  let js = await fetchAsset(`${JSDELIVR}planner.min.js`);
  if (js === null) js = await fetchAsset(`${PAGES}planner.min.js`);
  if (css === null || js === null) {
    console.error(
      "error: cannot fetch planner assets (no release yet — tag v0.1.0 first); offline alternative: npm-free inline is not possible",
    );
    process.exit(1);
  }
  const source = await Bun.file(doc).text();
  const cssRe = /<link\b[^>]*planner\.min\.css[^>]*>/;
  const jsRe = /<script\b[^>]*planner\.min\.js[^>]*>.*?<\/script>/s;
  const inlined = source
    .replace(cssRe, `<style>\n${css}\n</style>`)
    .replace(jsRe, `<script>\n${js}\n</script>`);
  const out = `${doc.replace(/\.html$/i, "")}.standalone.html`;
  await Bun.write(out, inlined);
  console.log(`wrote ${out} (fully self-contained, opens offline)`);
}

async function cmdFmt(args: string[]): Promise<void> {
  const doc = args[0];
  if (doc === undefined) {
    console.error("usage: planner fmt <doc>");
    process.exit(2);
  }
  const child = spawn("bunx", ["oxfmt", doc], { stdio: "inherit" });
  child.on("error", () => {
    console.error("error: oxfmt not found");
    process.exit(1);
  });
  const code = await new Promise<number>((resolveExit) => {
    child.on("exit", (c) => resolveExit(c ?? 1));
  });
  process.exit(code);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === "-h" || command === "--help") {
    printUsage();
    process.exit(0);
  }
  switch (command) {
    case "new": {
      await cmdNew(args);
      break;
    }
    case "validate": {
      await cmdValidate(args);
      break;
    }
    case "open": {
      await cmdOpen(args);
      break;
    }
    case "bundle": {
      await cmdBundle(args);
      break;
    }
    case "fmt": {
      await cmdFmt(args);
      break;
    }
    default: {
      console.error(`error: unknown command "${command}"`);
      printUsage();
      process.exit(2);
    }
  }
}

await main();
