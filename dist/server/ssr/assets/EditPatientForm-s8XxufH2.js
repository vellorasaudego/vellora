import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/admin/EditPatientForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CARE_LEVELS = [
	"Período diurno (8h/dia)",
	"Período noturno (12h/dia)",
	"Integral (12h/dia)",
	"24 horas"
];
function EditPatientForm({ patient, familyUsers, currentFamily }) {
	const router = useRouter();
	const [familyMode, setFamilyMode] = (0, import_react.useState)("keep");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [saved, setSaved] = (0, import_react.useState)(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSaved(false);
		const data = new FormData(e.currentTarget);
		const payload = {
			name: data.get("name"),
			birth_date: data.get("birth_date") || null,
			address: data.get("address") || null,
			care_level: data.get("care_level") || null,
			condition_summary: data.get("condition_summary") || null,
			notes: data.get("notes") || null,
			status: data.get("status")
		};
		if (familyMode === "existing") payload.family_user_id = data.get("family_user_id");
		else if (familyMode === "new") {
			payload.new_family_name = data.get("new_family_name");
			payload.new_family_email = data.get("new_family_email");
			payload.new_family_phone = data.get("new_family_phone");
			payload.new_family_password = data.get("new_family_password");
		}
		try {
			const res = await fetch(`/api/admin/patients/${patient.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const json = await res.json();
			if (!res.ok) {
				setError(json.error || "Não foi possível salvar.");
				setLoading(false);
				return;
			}
			setSaved(true);
			setFamilyMode("keep");
			router.refresh();
		} catch {
			setError("Erro de conexão. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold text-[var(--foreground)] mb-3",
				children: "Dados do paciente"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid sm:grid-cols-2 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nome completo *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "name",
							required: true,
							defaultValue: patient.name,
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Data de nascimento",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "date",
							name: "birth_date",
							defaultValue: patient.birth_date || "",
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Endereço",
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "address",
							defaultValue: patient.address || "",
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Plano de cuidado",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							name: "care_level",
							className: "input",
							defaultValue: patient.care_level || CARE_LEVELS[0],
							children: CARE_LEVELS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: l,
								children: l
							}, l))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Status",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							name: "status",
							className: "input",
							defaultValue: patient.status,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "pendente",
									children: "Pendente"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "ativo",
									children: "Ativo"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "inativo",
									children: "Inativo"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Resumo da condição de saúde",
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "condition_summary",
							rows: 2,
							defaultValue: patient.condition_summary || "",
							className: "input"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Observações internas",
						className: "sm:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "notes",
							rows: 2,
							defaultValue: patient.notes || "",
							className: "input"
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold text-[var(--foreground)] mb-3",
					children: "Conta da família"
				}),
				currentFamily && familyMode === "keep" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-[var(--muted)] mb-3",
					children: [
						"Vinculada a ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: currentFamily.name }),
						" (",
						currentFamily.email,
						")."
					]
				}),
				!currentFamily && familyMode === "keep" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-[var(--muted-2)] mb-3",
					children: "Nenhuma conta de família vinculada ainda."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 mb-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
							active: familyMode === "keep",
							onClick: () => setFamilyMode("keep"),
							label: "Manter"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
							active: familyMode === "existing",
							onClick: () => setFamilyMode("existing"),
							label: "Vincular conta existente"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeButton, {
							active: familyMode === "new",
							onClick: () => setFamilyMode("new"),
							label: "Criar nova conta"
						})
					]
				}),
				familyMode === "existing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Selecione a conta da família",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						name: "family_user_id",
						className: "input",
						required: true,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Selecione..."
						}), familyUsers.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: u.id,
							children: [
								u.name,
								" (",
								u.email,
								")"
							]
						}, u.id))]
					})
				}),
				familyMode === "new" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid sm:grid-cols-2 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nome do responsável *",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "new_family_name",
								required: true,
								className: "input"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Telefone",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "new_family_phone",
								className: "input"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "E-mail de acesso *",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "email",
								name: "new_family_email",
								required: true,
								className: "input"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Senha provisória *",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "password",
								name: "new_family_password",
								required: true,
								minLength: 12,
								autoComplete: "new-password",
								placeholder: "Crie uma senha provisória segura",
								className: "input"
							})
						})
					]
				})
			] }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-[var(--status-critical)]",
				children: error
			}),
			saved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-[var(--status-good)]",
				children: "Alterações salvas."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-t border-[var(--border)] pt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50",
					children: loading ? "Salvando..." : "Salvar alterações"
				})
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
        .input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-light);
        }
      `
			})
		]
	});
}
function ModeButton({ active, onClick, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: `rounded-lg px-3 py-2 text-xs font-medium border ${active ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-black/[0.03]"}`,
		children: label
	});
}
function Field({ label, children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "block text-xs font-medium text-[var(--muted)] mb-1",
			children: label
		}), children]
	});
}
//#endregion
export { EditPatientForm };
