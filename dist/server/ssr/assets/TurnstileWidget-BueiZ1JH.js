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
function TurnstileWidget({ siteKey, required = false, onToken }) {
	const containerRef = (0, import_react.useRef)(null);
	const onTokenRef = (0, import_react.useRef)(onToken);
	const [status, setStatus] = (0, import_react.useState)("loading");
	(0, import_react.useEffect)(() => {
		onTokenRef.current = onToken;
	}, [onToken]);
	(0, import_react.useEffect)(() => {
		if (!siteKey || !containerRef.current) return;
		let widgetId;
		let cancelled = false;
		setStatus("loading");
		loadTurnstile().then(() => {
			if (cancelled) return;
			if (!containerRef.current || !window.turnstile) {
				setStatus("error");
				onTokenRef.current("");
				return;
			}
			widgetId = window.turnstile.render(containerRef.current, {
				sitekey: siteKey,
				callback: (token) => {
					setStatus("verified");
					onTokenRef.current(token);
				},
				"expired-callback": () => {
					setStatus("expired");
					onTokenRef.current("");
				},
				"error-callback": () => {
					setStatus("error");
					onTokenRef.current("");
				}
			});
			setStatus("ready");
		}).catch(() => {
			setStatus("error");
			onTokenRef.current("");
		});
		return () => {
			cancelled = true;
			if (widgetId && window.turnstile?.remove) window.turnstile.remove(widgetId);
		};
	}, [siteKey]);
	if (!siteKey) {
		if (!required) return null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sm:col-span-2 rounded-lg border border-[var(--status-critical)]/40 bg-[var(--surface-soft)] p-3",
			role: "alert",
			"aria-live": "polite",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-[var(--status-critical)]",
				children: "Proteção de segurança indisponível"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-5 text-[var(--muted)]",
				children: "O envio está temporariamente bloqueado porque a verificação de segurança ainda não foi configurada."
			})]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "sm:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs text-[var(--muted)]",
				children: "Confirmação de segurança"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: containerRef,
				"aria-label": "Desafio de segurança"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-[var(--muted)]",
				role: "status",
				"aria-live": "polite",
				children: [
					status === "loading" ? "Carregando a proteção de segurança..." : null,
					status === "ready" ? "Conclua a verificação para liberar o envio." : null,
					status === "verified" ? "Verificação concluída." : null,
					status === "expired" ? "A verificação expirou. Conclua-a novamente para enviar." : null,
					status === "error" ? "Não foi possível carregar a verificação. Atualize a página e tente novamente." : null
				]
			})
		]
	});
}
//#endregion
export { TurnstileWidget as t };
