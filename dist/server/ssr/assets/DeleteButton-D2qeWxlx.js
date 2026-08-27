import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/admin/DeleteButton.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function DeleteButton({ endpoint, confirmText, label = "Excluir", redirectTo, compact = false }) {
	const router = useRouter();
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function remove() {
		if (!window.confirm(confirmText)) return;
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(endpoint, { method: "DELETE" });
			const result = await response.json().catch(() => null);
			if (!response.ok) throw new Error(result?.error || "Não foi possível excluir.");
			if (redirectTo) router.push(redirectTo);
			else router.refresh();
		} catch (removalError) {
			setError(removalError instanceof Error ? removalError.message : "Erro ao excluir o cadastro.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex flex-col items-start gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: remove,
			disabled: loading,
			className: compact ? "text-xs font-semibold text-[var(--status-critical)] hover:underline disabled:opacity-50" : "rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--status-critical)] hover:bg-red-50 disabled:opacity-50",
			children: loading ? "Excluindo..." : label
		}), error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "max-w-xs text-xs text-[var(--status-critical)]",
			role: "alert",
			children: error
		}) : null]
	});
}
//#endregion
export { DeleteButton };
