import "./chunk-ZRW5x4aP.js";
import { createElement, createRoot } from "@remix-run/component";
import { getQueriesForElement, prettyDOM } from "@testing-library/dom";
export * from "@testing-library/dom";
//#region src/pure.ts
let mountedContainers = /* @__PURE__ */ new Set();
let mountedRootEntries = [];
function wrapUiIfNeeded(innerElement, wrapperComponent) {
	return wrapperComponent ? createElement(wrapperComponent, void 0, innerElement) : innerElement;
}
function render(ui, { virtualRootOptions = {}, container, baseElement, wrapper, queries } = {}) {
	baseElement ??= document.body;
	container ??= baseElement.appendChild(document.createElement("div"));
	let root;
	if (!mountedContainers.has(container)) {
		root = createRoot(container, virtualRootOptions);
		mountedRootEntries.push({
			root,
			container
		});
		mountedContainers.add(container);
	} else mountedRootEntries.forEach((rootEntry) => {
		if (rootEntry.container === container) root = rootEntry.root;
	});
	if (!root) throw new Error("Unable to find root for container. This should never happen, please report this to the maintainers of @mcansh/remix-testing-library.");
	return renderRoot(ui, {
		root,
		virtualRootOptions,
		baseElement,
		container,
		wrapper,
		queries
	});
}
function renderRoot(ui, { root, virtualRootOptions, container, baseElement, wrapper: WrapperComponent, queries }) {
	root.render(wrapUiIfNeeded(ui, WrapperComponent));
	return {
		container,
		baseElement,
		debug(el = baseElement, maxLength, options) {
			let elements = Array.isArray(el) ? el : [el];
			for (let element of elements) {
				if (!element) continue;
				console.log(prettyDOM(element, maxLength, options));
			}
		},
		dispose: () => {
			root.dispose();
		},
		rerender: (rerenderUi) => {
			renderRoot(rerenderUi, {
				container,
				baseElement,
				root,
				virtualRootOptions
			});
		},
		asFragment: () => {
			if (typeof document.createRange === "function") return document.createRange().createContextualFragment(container.innerHTML);
			else {
				const template = document.createElement("template");
				template.innerHTML = container.innerHTML;
				return template.content;
			}
		},
		...getQueriesForElement(baseElement, queries)
	};
}
function cleanup() {
	mountedRootEntries.forEach(({ root, container }) => {
		root.dispose();
		if (container.parentNode === document.body) document.body.removeChild(container);
	});
	mountedRootEntries.length = 0;
	mountedContainers.clear();
}
//#endregion
export { cleanup, render };

//# sourceMappingURL=pure.js.map