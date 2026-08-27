import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
//#region src/components/TurnstileWidget.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var scriptPromise = null;
function loadTurnstile() {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.turnstile) return Promise.resolve();
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise((resolve, reject) => {
		const existing = document.querySelector("script[data-vellora-turnstile=\"true\"]");
		if (existing) {
			existing.addEventListener("load", () => resolve(), { once: true });
			existing.addEventListener("error", () => reject(/* @__PURE__ */ new Error("Turnstile indisponível.")), { once: true });
			return;
		}
		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
		script.async = true;
		script.defer = true;
		script.dataset.velloraTurnstile = "true";
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener("error", () => reject(/* @__PURE__ */ new Error("Turnstile indisponível.")), { once: true });
		document.head.appendChild(script);
	});
	return scriptPromise;
}
function TurnstileWidget({ siteKey, onToken }) {
	const containerRef = (0, import_react.useRef)(null);
	const onTokenRef = (0, import_react.useRef)(onToken);
	(0, import_react.useEffect)(() => {
		onTokenRef.current = onToken;
	}, [onToken]);
	(0, import_react.useEffect)(() => {
		if (!siteKey || !containerRef.current) return;
		let widgetId;
		let cancelled = false;
		loadTurnstile().then(() => {
			if (cancelled || !containerRef.current || !window.turnstile) return;
			widgetId = window.turnstile.render(containerRef.current, {
				sitekey: siteKey,
				callback: (token) => onTokenRef.current(token),
				"expired-callback": () => onTokenRef.current(""),
				"error-callback": () => onTokenRef.current("")
			});
		}).catch(() => onTokenRef.current(""));
		return () => {
			cancelled = true;
			if (widgetId && window.turnstile?.remove) window.turnstile.remove(widgetId);
		};
	}, [siteKey]);
	if (!siteKey) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "sm:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-xs text-[var(--muted)]",
			children: "Confirmação de segurança"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: containerRef,
			"aria-label": "Desafio de segurança"
		})]
	});
}
//#endregion
export { TurnstileWidget as t };
