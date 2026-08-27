import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/admin/ContractManager.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function formatBytes(value) {
	return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(value) {
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
function ContractManager({ ownerType, ownerId, contracts }) {
	const router = useRouter();
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function upload(event) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		data.set("owner_type", ownerType);
		data.set("owner_id", ownerId);
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/admin/contracts", {
				method: "POST",
				body: data
			});
			const result = await response.json().catch(() => null);
			if (!response.ok) throw new Error(result?.error || "Não foi possível anexar o contrato.");
			form.reset();
			router.refresh();
		} catch (uploadError) {
			setError(uploadError instanceof Error ? uploadError.message : "Erro ao anexar o contrato.");
		} finally {
			setLoading(false);
		}
	}
	async function remove(id, fileName) {
		if (!window.confirm(`Excluir o contrato “${fileName}”? Esta ação não pode ser desfeita.`)) return;
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
			const result = await response.json().catch(() => null);
			if (!response.ok) throw new Error(result?.error || "Não foi possível excluir o contrato.");
			router.refresh();
		} catch (removalError) {
			setError(removalError instanceof Error ? removalError.message : "Erro ao excluir o contrato.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "text-sm font-semibold text-[var(--foreground)]",
					children: "Contratos assinados"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-[var(--muted)]",
					children: "PDF de até 4 MB. O titular pode apenas visualizar."
				})] })
			}),
			contracts.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-2",
				children: contracts.map((contract) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: `/api/contracts/${contract.id}`,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "block truncate text-sm font-semibold text-[var(--brand)] hover:underline",
							children: contract.file_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-[var(--muted-2)]",
							children: [
								formatBytes(contract.file_size),
								" · ",
								formatDate(contract.created_at)
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: loading,
						onClick: () => remove(contract.id, contract.file_name),
						className: "text-xs font-semibold text-[var(--status-critical)] hover:underline disabled:opacity-50",
						children: "Excluir arquivo"
					})]
				}, contract.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs text-[var(--muted-2)]",
				children: "Nenhum contrato anexado."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: upload,
				className: "mt-3 flex flex-col gap-2 sm:flex-row sm:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					name: "file",
					accept: "application/pdf,.pdf",
					required: true,
					className: "min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-light)] file:px-3 file:py-1.5 file:font-semibold file:text-[var(--brand-dark)]"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "min-h-10 rounded-lg bg-[var(--brand-dark)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50",
					children: loading ? "Enviando..." : "Anexar PDF"
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-[var(--status-critical)]",
				role: "alert",
				children: error
			}) : null
		]
	});
}
//#endregion
export { ContractManager };
