/* ai-skill-html-planner v0.3.0 */
(function() {
	//#region src/runtime/allowlist.generated.ts
	var ALLOWLIST = [
		"absolute",
		"arch",
		"arch-arrow",
		"arch-node",
		"avoid",
		"badge",
		"block",
		"border",
		"callout",
		"card",
		"chart-bar",
		"chart-label",
		"chart-line",
		"chart-mark",
		"check",
		"check--done",
		"collapse",
		"contents",
		"decision",
		"decision-row",
		"filetree",
		"fixed",
		"flex",
		"flow",
		"footer",
		"gap-2",
		"grid",
		"grid--2",
		"grid--3",
		"grid--4",
		"grow",
		"hero",
		"hidden",
		"inline",
		"is-active",
		"is-visible",
		"kicker",
		"lead",
		"lede",
		"matrix",
		"meta",
		"muted",
		"no-section-numbers",
		"ordinal",
		"org",
		"outline",
		"pl-back-to-top",
		"pl-copy",
		"pl-heading-anchor",
		"pl-toc",
		"quote",
		"relative",
		"ring",
		"rounded",
		"small",
		"stat",
		"static",
		"steps",
		"sticky",
		"table",
		"timeline",
		"toc",
		"transition",
		"two-col",
		"underline",
		"uppercase",
		"visible",
		"w3"
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
		if (nav === null) return null;
		const headings = [...document.querySelectorAll("h2, h3")].filter((el) => el.closest(".hero") === null && (el.textContent?.trim() ?? "") !== "");
		if (headings.length === 0) return null;
		const root = document.createElement("ul");
		let lastH2Li = null;
		for (const heading of headings) {
			const text = heading.textContent?.trim() ?? "";
			const id = nextId((heading.id.trim() !== "" ? heading.id : slugify(text)) || "section");
			heading.id = id;
			const anchor = document.createElement("a");
			anchor.href = `#${id}`;
			anchor.className = "pl-heading-anchor";
			anchor.textContent = "#";
			anchor.setAttribute("aria-label", `Link to "${text}"`);
			heading.append(anchor);
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
		return nav;
	}
	function buildScrollSpy(nav) {
		const links = /* @__PURE__ */ new Map();
		for (const a of nav.querySelectorAll("a[href^='#']")) links.set(a.getAttribute("href") ?? "", a);
		const targets = [...links.keys()].map((href) => document.getElementById(href.slice(1))).filter((el) => el !== null);
		const setActive = (href) => {
			for (const [key, a] of links) {
				const on = key === href;
				a.classList.toggle("is-active", on);
				if (on) a.setAttribute("aria-current", "true");
				else a.removeAttribute("aria-current");
			}
		};
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
		}, {
			rootMargin: "-20% 0px -70% 0px",
			threshold: 0
		});
		for (const target of targets) observer.observe(target);
		if (targets.length > 0) setActive(`#${targets[0].id}`);
	}
	function buildBackToTop() {
		if (document.querySelector("nav.pl-toc") !== null) return;
		const link = document.createElement("a");
		link.href = "#";
		link.className = "pl-back-to-top";
		link.textContent = "Back to top";
		link.setAttribute("aria-label", "Back to top");
		document.body.append(link);
		const SCROLL_THRESHOLD = 600;
		const updateVisibility = () => {
			link.classList.toggle("is-visible", window.scrollY > SCROLL_THRESHOLD);
		};
		window.addEventListener("scroll", updateVisibility, { passive: true });
		updateVisibility();
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
		const nav = buildToc();
		if (nav !== null) buildScrollSpy(nav);
		buildBackToTop();
		addCopyButtons();
		lintClasses();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else init();
	//#endregion
})();
