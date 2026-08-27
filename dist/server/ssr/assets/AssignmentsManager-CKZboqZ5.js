import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/admin/AssignmentsManager.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function AssignmentsManager({ patientId, assignments, caregivers }) {
	const router = useRouter();
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const assignedIds = new Set(assignments.filter((a) => a.active).map((a) => a.caregiver_user_id));
	const available = caregivers.filter((c) => !assignedIds.has(c.id));
	async function handleAdd(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const data = new FormData(e.currentTarget);
		try {
			const res = await fetch("/api/admin/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patient_id: patientId,
					caregiver_user_id: data.get("caregiver_user_id"),
					start_date: data.get("start_date")
				})
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error || "Não foi possível vincular.");
			e.currentTarget.reset();
			router.refresh();
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "Não foi possível vincular.");
		} finally {
			setLoading(false);
		}
	}
	async function handleDeactivate(id) {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/admin/assignments/${id}`, { method: "PATCH" });
			const result = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(result.error || "Não foi possível encerrar o vínculo.");
			router.refresh();
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "Não foi possível encerrar o vínculo.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2 mb-5",
			children: [assignments.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-[var(--muted-2)]",
				children: "Nenhum cuidador vinculado ainda."
			}), assignments.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium text-[var(--foreground)]",
					children: a.caregiverName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-[var(--muted-2)]",
					children: [
						"Desde ",
						(/* @__PURE__ */ new Date(a.start_date + "T00:00:00")).toLocaleDateString("pt-BR"),
						!a.active && a.end_date ? ` · encerrado em ${(/* @__PURE__ */ new Date(a.end_date + "T00:00:00")).toLocaleDateString("pt-BR")}` : ""
					]
				})] }), a.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => handleDeactivate(a.id),
					disabled: loading,
					className: "text-xs font-medium text-[var(--status-critical)] hover:underline disabled:opacity-50",
					children: "Encerrar vínculo"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-[var(--muted-2)]",
					children: "Inativo"
				})]
			}, a.id))]
		}),
		available.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleAdd,
			className: "flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 min-w-[200px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "block text-xs font-medium text-[var(--muted)] mb-1",
						children: "Cuidador"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						name: "caregiver_user_id",
						required: true,
						className: "input",
						children: available.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: c.id,
							children: c.name
						}, c.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "block text-xs font-medium text-[var(--muted)] mb-1",
					children: "Início"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "date",
					name: "start_date",
					defaultValue: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
					className: "input"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50",
					children: "Vincular"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-[var(--muted-2)] border-t border-[var(--border)] pt-4",
			children: "Todos os cuidadores cadastrados já estão vinculados a este paciente."
		}),
		error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-[var(--status-critical)]",
			children: error
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", {
			jsx: true,
			children: `
        .input {
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          width: 100%;
        }
      `
		})
	] });
}
//#endregion
export { AssignmentsManager };
