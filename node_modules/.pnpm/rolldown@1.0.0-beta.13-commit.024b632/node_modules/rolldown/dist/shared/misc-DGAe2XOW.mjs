import { __esm } from "./chunk--iN_1bjD.mjs";

//#region src/utils/misc.ts
function arraify(value) {
	return Array.isArray(value) ? value : [value];
}
function isNullish(value) {
	return value === null || value === void 0;
}
function isPromiseLike(value) {
	return value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
}
function unimplemented(info) {
	if (info) throw new Error(`unimplemented: ${info}`);
	throw new Error("unimplemented");
}
function unreachable(info) {
	if (info) throw new Error(`unreachable: ${info}`);
	throw new Error("unreachable");
}
function unsupported(info) {
	throw new Error(`UNSUPPORTED: ${info}`);
}
function noop(..._args) {}
var init_misc = __esm({ "src/utils/misc.ts"() {} });

//#endregion
export { arraify, init_misc, isNullish, isPromiseLike, noop, unimplemented, unreachable, unsupported };