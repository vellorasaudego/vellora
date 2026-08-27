import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/admin/NewCaregiverForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function NewCaregiverForm() {
	const router = useRouter();
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const data = new FormData(e.currentTarget);
		const res = await fetch("/api/admin/caregivers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: data.get("name"),
				email: data.get("email"),
				phone: data.get("phone"),
				password: data.get("password")
			})
		});
		const json = await res.json();
		setLoading(false);
		if (!res.ok) {
			setError(json.error || "Não foi possível cadastrar.");
			return;
		}
		e.target.reset();
		setOpen(false);
		router.refresh();
	}
	if (!open) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick: () => setOpen(true),
		className: "rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)]",
		children: "+ Novo cuidador"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 max-w-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold text-[var(--foreground)] mb-4",
				children: "Cadastrar cuidador"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid sm:grid-cols-2 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nome completo *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "name",
							required: true,
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Telefone",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "phone",
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "E-mail de acesso *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							name: "email",
							required: true,
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Senha provisória *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							name: "password",
							required: true,
							minLength: 12,
							autoComplete: "new-password",
							placeholder: "Crie uma senha provisória segura",
							className: "input"
						})
					})
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-[var(--status-critical)]",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50",
					children: loading ? "Salvando..." : "Cadastrar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setOpen(false),
					className: "rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-black/[0.03]",
					children: "Cancelar"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", {
				jsx: true,
				children: `
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
        }
      `
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "block text-xs font-medium text-[var(--muted)] mb-1",
		children: label
	}), children] });
}
//#endregion
export { NewCaregiverForm };
