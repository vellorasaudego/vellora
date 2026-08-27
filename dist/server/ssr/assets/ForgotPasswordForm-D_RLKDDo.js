import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
//#region src/components/ForgotPasswordForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function ForgotPasswordForm() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email })
			});
			const data = await response.json();
			if (!response.ok) setError(data.error || "Não foi possível enviar as instruções.");
			else setMessage(data.message);
		} catch {
			setError("Erro de conexão. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "recovery-email",
				className: "mb-1.5 block text-sm font-semibold text-[var(--foreground)]",
				children: "E-mail de acesso"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "recovery-email",
				type: "email",
				autoComplete: "email",
				required: true,
				value: email,
				onChange: (event) => setEmail(event.target.value),
				className: "form-control",
				placeholder: "voce@email.com"
			})] }),
			message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]",
				role: "status",
				children: message
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-[var(--status-critical)]",
				role: "alert",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				disabled: loading || !!message,
				className: "w-full rounded-full bg-[var(--brand-dark)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50",
				children: loading ? "Enviando..." : "Enviar instruções"
			})
		]
	});
}
//#endregion
export { ForgotPasswordForm };
