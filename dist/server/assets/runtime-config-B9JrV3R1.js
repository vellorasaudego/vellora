//#region src/lib/runtime-config.ts
var requestBindings;
function globalBindings() {
	const value = globalThis.__VELLORA_RUNTIME_BINDINGS__;
	return value && typeof value === "object" ? value : {};
}
function setRuntimeBindings(value) {
	requestBindings = value && typeof value === "object" ? value : void 0;
	globalThis.__VELLORA_RUNTIME_BINDINGS__ = requestBindings;
}
function runtimeBinding(key) {
	return (requestBindings || globalBindings())[key];
}
function runtimeValue(key) {
	const workerValue = runtimeBinding(key);
	if (typeof workerValue === "string") return workerValue;
	const processValue = typeof process !== "undefined" ? process.env[key] : void 0;
	return typeof processValue === "string" ? processValue : void 0;
}
//#endregion
export { runtimeValue as n, setRuntimeBindings as r, runtimeBinding as t };
