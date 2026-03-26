import "./chunk-ZRW5x4aP.js";
import { cleanup, render } from "./pure.js";
export * from "@testing-library/dom";
if (typeof process === "undefined" || !process.env?.RTL_SKIP_AUTO_CLEANUP) {
	/* v8 ignore else */
	if (typeof globalThis.afterEach === "function") globalThis.afterEach(() => {
		cleanup();
	});
	else if (typeof globalThis.teardown === "function") globalThis.teardown(() => {
		cleanup();
	});
}
//#endregion
export { cleanup, render };

//# sourceMappingURL=index.js.map