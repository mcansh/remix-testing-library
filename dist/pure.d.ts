import { RemixNode, VirtualRootOptions } from "@remix-run/component";
import * as _testing_library_dom0 from "@testing-library/dom";
import { PrettyDOMOptions, Queries, queries as queries$1 } from "@testing-library/dom";
export * from "@testing-library/dom";

//#region src/pure.d.ts
declare function render<Q extends Queries = typeof queries$1>(ui: RemixNode, {
  virtualRootOptions,
  container,
  baseElement,
  wrapper,
  queries
}?: {
  virtualRootOptions?: VirtualRootOptions;
  container?: HTMLElement;
  baseElement?: HTMLElement;
  wrapper?: any;
  queries?: Q;
}): {
  container: HTMLElement;
  baseElement: HTMLElement;
  debug(el?: SingleOrMany<HTMLElement | null>, maxLength?: number, options?: PrettyDOMOptions): void;
  dispose: () => void;
  rerender: (rerenderUi: RemixNode) => void;
  asFragment: () => DocumentFragment;
} & _testing_library_dom0.BoundFunctions<Q>;
type SingleOrMany<T> = T | Array<T>;
declare function cleanup(): void;
//#endregion
export { cleanup, render };
//# sourceMappingURL=pure.d.ts.map