import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import Link from "./link-H0xyTzG3.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
import { t as Pill } from "./Badge-GkJ2fqSu.js";
import { DeleteButton } from "./DeleteButton-D2qeWxlx.js";
//#region src/components/admin/LeadsTable.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var STATUS_OPTIONS = [
	"novo",
	"em_contato",
	"convertido",
	"recusado"
];
function LeadsTable({ leads }) {
	const router = useRouter();
	const [pending, startTransition] = (0, import_react.useTransition)();
	const [updatingId, setUpdatingId] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	function updateStatus(id, status) {
		setUpdatingId(id);
		setError(null);
		startTransition(async () => {
			try {
				if (!(await fetch(`/api/admin/leads/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status })
				})).ok) throw new Error("Não foi possível atualizar o status da solicitação.");
				router.refresh();
			} catch (updateError) {
				setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar a solicitação.");
			} finally {
				setUpdatingId(null);
			}
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-4 text-sm text-[var(--status-critical)]",
		role: "alert",
		children: error
	}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-[var(--border)] text-left text-xs text-[var(--muted-2)] uppercase tracking-wide",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Contato"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Familiar / Paciente"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Tipo de cuidado"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Mensagem"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Status"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Ações"
					})
				]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: leads.map((lead) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-[var(--border)] last:border-0 align-top",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-5 py-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-[var(--foreground)]",
								children: lead.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[var(--muted-2)]",
								children: lead.phone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[var(--muted-2)]",
								children: lead.email
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-5 py-4 text-[var(--foreground)]",
						children: lead.patient_name || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-5 py-4 text-[var(--foreground)]",
						children: lead.care_type || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-5 py-4 text-[var(--muted)] max-w-[220px]",
						children: lead.message || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-5 py-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: lead.status,
							disabled: pending && updatingId === lead.id,
							onChange: (e) => updateStatus(lead.id, e.target.value),
							className: "rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs",
							children: STATUS_OPTIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: s,
								children: s
							}, s))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { value: lead.status })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-5 py-4 min-w-[140px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-start gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								href: `/admin/pacientes/novo?lead=${lead.id}`,
								className: "text-[var(--brand)] hover:underline",
								children: "Converter em paciente"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteButton, {
								endpoint: `/api/admin/leads/${lead.id}`,
								confirmText: `Excluir definitivamente a solicitação de ${lead.name}?`,
								label: "Excluir formulário",
								compact: true
							})]
						})
					})
				]
			}, lead.id)) })]
		}), leads.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "p-6 text-sm text-[var(--muted-2)]",
			children: "Nenhum contato recebido ainda."
		})]
	})] });
}
//#endregion
export { LeadsTable };
