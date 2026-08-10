/* ai-skill-html-planner v0.1.0 */
(function() {
	//#region src/runtime/allowlist.generated.ts
	var ALLOWLIST = [
		"absolute",
		"block",
		"border",
		"fixed",
		"flex",
		"gap-2",
		"grid",
		"inline",
		"relative",
		"static",
		"table",
		"uppercase"
	];
	//#endregion
	//#region src/runtime/main.ts
	var usedIds = /* @__PURE__ */ new Set();
	var copyTimers = /* @__PURE__ */ new WeakMap();
	function slugify(text) {
		return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	}
	function nextId(base) {
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
	function buildToc() {
		const nav = document.querySelector("nav.pl-toc");
		if (nav === null) return;
		const headings = [...document.querySelectorAll("h2, h3")].filter((el) => el.closest(".hero") === null && (el.textContent?.trim() ?? "") !== "");
		if (headings.length === 0) return;
		const root = document.createElement("ul");
		let lastH2Li = null;
		for (const heading of headings) {
			const text = heading.textContent?.trim() ?? "";
			const id = nextId((heading.id.trim() !== "" ? heading.id : slugify(text)) || "section");
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
				if (heading.tagName === "H2") lastH2Li = li;
			}
		}
		nav.replaceChildren(root);
	}
	function fallbackCopy(text) {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.left = "-9999px";
		document.body.append(ta);
		ta.select();
		document.execCommand("copy");
		ta.remove();
	}
	function showCopied(button) {
		const pending = copyTimers.get(button);
		if (pending !== void 0) globalThis.clearTimeout(pending);
		button.textContent = "Copied";
		copyTimers.set(button, globalThis.setTimeout(() => {
			button.textContent = "Copy";
		}, 1500));
	}
	async function copyCode(pre, button) {
		const code = pre.textContent ?? "";
		let ok = false;
		if (navigator.clipboard) try {
			await navigator.clipboard.writeText(code);
			ok = true;
		} catch {
			ok = false;
		}
		if (!ok) fallbackCopy(code);
		showCopied(button);
	}
	function addCopyButtons() {
		for (const pre of document.querySelectorAll("pre[data-file]")) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "pl-copy";
			button.setAttribute("aria-label", "Copy code");
			button.textContent = "Copy";
			button.style.position = "absolute";
			button.style.top = "0";
			button.style.right = "0";
			if (getComputedStyle(pre).position === "static") pre.style.position = "relative";
			button.addEventListener("click", () => {
				copyCode(pre, button);
			});
			pre.append(button);
		}
	}
	function lintClasses() {
		const allowlist = new Set(ALLOWLIST);
		for (const el of document.querySelectorAll("*")) for (const token of el.classList) {
			if (token.startsWith("pl-") || allowlist.has(token)) continue;
			console.warn(`[planner] unknown class "${token}" (not in compiled CSS)`);
		}
	}
	function init() {
		buildToc();
		addCopyButtons();
		lintClasses();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else init();
	//#endregion
})();
