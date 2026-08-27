import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
import { t as Pill } from "./Badge-GkJ2fqSu.js";
import { DeleteButton } from "./DeleteButton-D2qeWxlx.js";
//#region src/components/admin/ProfessionalApplicationsTable.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var STATUS_OPTIONS = [
	"novo",
	"em_analise",
	"aprovado",
	"recusado"
];
var DAY_LABELS = {
	segunda: "Seg",
	terca: "Ter",
	quarta: "Qua",
	quinta: "Qui",
	sexta: "Sex",
	sabado: "Sáb",
	domingo: "Dom"
};
var SHIFT_LABELS = {
	manha: "Manhã",
	tarde: "Tarde",
	noite: "Noite",
	plantao_12h_diurno: "12h diurno",
	plantao_12h_noturno: "12h noturno",
	plantao_24h: "24h"
};
var STATUS_LABELS = {
	novo: "Novo",
	em_analise: "Em análise",
	aprovado: "Aprovado",
	recusado: "Recusado"
};
var PROFESSION_LABELS = {
	cuidador: "Cuidador(a)",
	tecnico_enfermagem: "Técnico(a) de enfermagem",
	enfermeiro: "Enfermeiro(a)",
	outros: "Outros"
};
function formatDate(value) {
	if (!value) return "A combinar";
	const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}
function ProfessionalApplicationsTable({ applications }) {
	const router = useRouter();
	const [pending, startTransition] = (0, import_react.useTransition)();
	const [updatingId, setUpdatingId] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	function updateStatus(id, status) {
		setUpdatingId(id);
		setError(null);
		startTransition(async () => {
			try {
				if (!(await fetch(`/api/admin/professionals/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status })
				})).ok) throw new Error("Não foi possível atualizar o status.");
				router.refresh();
			} catch (updateError) {
				setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar o cadastro.");
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
			className: "w-full min-w-[1080px] text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-2)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Profissional"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Área"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Disponibilidade"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Experiência"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-5 py-3 font-medium",
						children: "Observações"
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
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: applications.map((application) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-[var(--border)] align-top last:border-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-5 py-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-[var(--foreground)]",
								children: application.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[var(--muted-2)]",
								children: application.phone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[var(--muted-2)]",
								children: application.email
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-[var(--muted-2)]",
								children: application.city || "Cidade não informada"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-[var(--muted-2)]",
								children: application.lgpd_consent_at ? `Consentimento LGPD: ${formatDate(application.lgpd_consent_at)}` : "Consentimento LGPD sem data registrada"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-5 py-4 text-[var(--foreground)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: PROFESSION_LABELS[application.profession]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-[var(--muted-2)]",
								children: ["COREN: ", application.coren || "Não se aplica"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-xs text-[var(--muted-2)]",
								children: ["Recebido em ", formatDate(application.created_at)]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "max-w-[260px] px-5 py-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-[var(--foreground)]",
								children: application.availability_days.map((day) => DAY_LABELS[day] || day).join(", ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[var(--muted)]",
								children: application.availability_shifts.map((shift) => SHIFT_LABELS[shift] || shift).join(", ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-xs text-[var(--muted-2)]",
								children: ["Início: ", formatDate(application.available_from)]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-5 py-4 text-[var(--foreground)]",
						children: application.experience || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "max-w-[260px] whitespace-pre-wrap px-5 py-4 text-[var(--muted)]",
						children: application.notes || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "min-w-[150px] px-5 py-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: application.status,
								"aria-label": `Status de ${application.name}`,
								disabled: pending && updatingId === application.id,
								onChange: (event) => updateStatus(application.id, event.target.value),
								className: "rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs",
								children: STATUS_OPTIONS.map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: status,
									children: STATUS_LABELS[status]
								}, status))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { value: application.status })
							}),
							application.status === "aprovado" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs leading-5 text-[var(--accent)]",
								children: "Incluído no banco de cuidadores."
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "min-w-[150px] px-5 py-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteButton, {
							endpoint: `/api/admin/professionals/${application.id}`,
							confirmText: `Excluir definitivamente a candidatura de ${application.name}? O perfil aprovado no banco de cuidadores será preservado.`,
							label: "Excluir formulário",
							compact: true
						})
					})
				]
			}, application.id)) })]
		}), applications.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "p-6 text-sm text-[var(--muted-2)]",
			children: "Nenhuma candidatura recebida ainda."
		}) : null]
	})] });
}
//#endregion
export { ProfessionalApplicationsTable };
