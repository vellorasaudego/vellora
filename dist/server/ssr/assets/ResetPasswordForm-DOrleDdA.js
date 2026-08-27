import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/ResetPasswordForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function ResetPasswordForm({ token, provider = "legacy", initialError }) {
	const router = useRouter();
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirmation, setConfirmation] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(initialError ?? null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	async function handleSubmit(event) {
		event.preventDefault();
		setError(null);
		if (password !== confirmation) {
			setError("As senhas não coincidem.");
			return;
		}
		setLoading(true);
		try {
			const response = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...provider === "legacy" ? { token } : {},
					password
				})
			});
			const data = await response.json().catch(() => null);
			if (!response.ok) {
				setError(typeof data?.error === "string" ? data.error : "Não foi possível redefinir a senha. Tente novamente mais tarde.");
				setLoading(false);
				return;
			}
			router.replace("/login?senha=redefinida");
			router.refresh();
		} catch {
			setError("Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.");
			setLoading(false);
		}
	}
	if (provider === "legacy" && !token) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]",
		role: "alert",
		children: "Este link está incompleto. Solicite um novo e-mail de recuperação."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "new-password",
				className: "mb-1.5 block text-sm font-semibold text-[var(--foreground)]",
				children: "Nova senha"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "new-password",
				type: "password",
				autoComplete: "new-password",
				required: true,
				minLength: 12,
				maxLength: 128,
				value: password,
				onChange: (event) => setPassword(event.target.value),
				className: "form-control",
				placeholder: "Mínimo de 12 caracteres"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "confirm-password",
				className: "mb-1.5 block text-sm font-semibold text-[var(--foreground)]",
				children: "Confirme a nova senha"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "confirm-password",
				type: "password",
				autoComplete: "new-password",
				required: true,
				minLength: 12,
				maxLength: 128,
				value: confirmation,
				onChange: (event) => setConfirmation(event.target.value),
				className: "form-control",
				placeholder: "Digite a senha novamente"
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
				children: loading ? "Salvando..." : "Criar nova senha"
			})
		]
	});
}
//#endregion
export { ResetPasswordForm };
