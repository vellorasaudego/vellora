import { env } from "cloudflare:workers";
//#region src/lib/runtime-config.ts
function runtimeValue(key) {
	const workerValue = env[key];
	if (typeof workerValue === "string") return workerValue;
	const processValue = process.env[key];
	return typeof processValue === "string" ? processValue : void 0;
}
//#endregion
export { runtimeValue as t };
