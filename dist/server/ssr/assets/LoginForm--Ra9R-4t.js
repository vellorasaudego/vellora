import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import Link from "./link-H0xyTzG3.js";
//#region src/components/LoginForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function safeRedirect(value, fallback) {
	return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
function LoginForm({ next }) {
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password
				})
			});
			const json = await res.json();
			if (!res.ok) {
				setError(json.error || "Não foi possível entrar.");
				setLoading(false);
				return;
			}
			window.location.assign(safeRedirect(next, safeRedirect(json.redirect, "/")));
		} catch {
			setError("Erro de conexão. Tente novamente.");
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "login-email",
					className: "mb-1.5 block text-sm font-semibold text-[var(--foreground)]",
					children: "E-mail"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "login-email",
					type: "email",
					autoComplete: "email",
					required: true,
					value: email,
					onChange: (e) => setEmail(e.target.value),
					className: "form-control",
					placeholder: "voce@email.com"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1.5 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "login-password",
						className: "block text-sm font-semibold text-[var(--foreground)]",
						children: "Senha"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						href: "/esqueci-senha",
						className: "text-xs font-bold text-[var(--brand)] hover:text-[var(--brand-dark)]",
						children: "Esqueci minha senha"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "login-password",
					type: "password",
					autoComplete: "current-password",
					required: true,
					value: password,
					onChange: (e) => setPassword(e.target.value),
					className: "form-control",
					placeholder: "••••••••"
				})] }),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-[var(--status-critical)]",
					role: "alert",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "w-full rounded-full bg-[var(--brand-dark)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50",
					children: loading ? "Entrando..." : "Entrar"
				})
			]
		})
	});
}
//#endregion
export { LoginForm };
