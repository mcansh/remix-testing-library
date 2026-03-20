import type { RemixNode, VirtualRoot, VirtualRootOptions } from "@remix-run/component";
import { createElement, createRoot } from "@remix-run/component";
import type { PrettyDOMOptions } from "@testing-library/dom";
import { getQueriesForElement, prettyDOM } from "@testing-library/dom";

let mountedContainers = new Set<HTMLElement>();

let mountedRootEntries: Array<{
  root: ReturnType<typeof createRoot>;
  container: HTMLElement;
}> = [];

function wrapUiIfNeeded(innerElement: RemixNode, wrapperComponent?: any) {
  return wrapperComponent ? createElement(wrapperComponent, undefined, innerElement) : innerElement;
}

function render(
  ui: RemixNode,
  {
    virtualRootOptions = {},
    container,
    baseElement,
    wrapper,
  }: {
    virtualRootOptions?: VirtualRootOptions;
    container?: HTMLElement;
    baseElement?: HTMLElement;
    wrapper?: any;
  } = {},
) {
  baseElement ??= document.body;
  container ??= baseElement.appendChild(document.createElement("div"));

  let root: VirtualRoot | undefined;

  if (!mountedContainers.has(container)) {
    root = createRoot(container, virtualRootOptions);
    mountedRootEntries.push({ root, container });
    mountedContainers.add(container);
  } else {
    mountedRootEntries.forEach((rootEntry) => {
      if (rootEntry.container === container) {
        root = rootEntry.root;
      }
    });
  }

  if (!root) {
    throw new Error(
      "Unable to find root for container. This should never happen, please report this to the maintainers of @mcansh/remix-testing-library.",
    );
  }

  return renderRoot(ui, {
    root,
    virtualRootOptions,
    baseElement,
    container,
    wrapper,
  });
}

function renderRoot(
  ui: RemixNode,
  {
    root,
    virtualRootOptions,
    container,
    baseElement,
    wrapper: WrapperComponent,
  }: {
    root: VirtualRoot;
    virtualRootOptions?: VirtualRootOptions;
    container: HTMLElement;
    baseElement: HTMLElement;
    wrapper?: any;
  },
) {
  root.render(wrapUiIfNeeded(ui, WrapperComponent));

  return {
    container,
    baseElement,
    debug(el: HTMLElement = baseElement, maxLength?: number, options?: PrettyDOMOptions) {
      let elements = Array.isArray(el) ? el : [el];
      for (let element of elements) {
        console.log(prettyDOM(element, maxLength, options));
      }
    },
    dispose: () => {
      root.dispose();
    },
    rerender: (rerenderUi: RemixNode) => {
      renderRoot(rerenderUi, {
        container,
        baseElement,
        root,
        virtualRootOptions,
      });
    },
    asFragment: () => {
      if (typeof document.createRange === "function") {
        return document.createRange().createContextualFragment(container.innerHTML);
      } else {
        const template = document.createElement("template");
        template.innerHTML = container.innerHTML;
        return template.content;
      }
    },
    ...getQueriesForElement(baseElement),
  };
}

function cleanup() {
  mountedRootEntries.forEach(({ root, container }) => {
    root.dispose();
    if (container.parentNode === document.body) {
      document.body.removeChild(container);
    }
  });
  mountedRootEntries.length = 0;
  mountedContainers.clear();
}

// just re-export everything from dom-testing-library
export * from "@testing-library/dom";
export { cleanup, render };
