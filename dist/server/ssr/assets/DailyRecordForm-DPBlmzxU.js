import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/DailyRecordForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var MOODS = [
	{
		value: "bem",
		label: "😊 Bem"
	},
	{
		value: "neutro",
		label: "😐 Neutro"
	},
	{
		value: "cansado",
		label: "😴 Cansado"
	},
	{
		value: "triste",
		label: "😔 Triste / desanimado"
	},
	{
		value: "agitado",
		label: "😣 Agitado / inquieto"
	}
];
function fieldValue(value) {
	return value ?? "";
}
function DailyRecordForm({ patientId, patientName, initialRecordDate, initialRecordTime, initialRecord }) {
	const router = useRouter();
	const isEditing = Boolean(initialRecord);
	const [incident, setIncident] = (0, import_react.useState)(initialRecord?.incident === 1);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [recordDate, setRecordDate] = (0, import_react.useState)(initialRecord?.record_date || initialRecordDate);
	const [recordTime, setRecordTime] = (0, import_react.useState)(initialRecord?.record_time || initialRecordTime);
	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		const formData = new FormData(event.currentTarget);
		formData.set("patient_id", patientId);
		if (initialRecord?.id) formData.set("record_id", initialRecord.id);
		if (!incident) formData.delete("incident_description");
		try {
			const response = await fetch("/api/records", {
				method: isEditing ? "PATCH" : "POST",
				body: formData
			});
			const result = await response.json().catch(() => null);
			if (!response.ok) {
				setError(result?.error || "Não foi possível salvar o registro.");
				setLoading(false);
				return;
			}
			router.push("/cuidador");
			router.refresh();
		} catch {
			setError("Erro de conexão. Tente novamente.");
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-1 text-sm font-semibold text-[var(--foreground)]",
						children: "Quando os sinais vitais foram medidos?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-4 text-xs leading-5 text-[var(--muted-2)]",
						children: "Preenchemos com a data e a hora atuais. Ajuste se a medição tiver sido realizada em outro momento."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid max-w-lg gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Data da medição",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								name: "record_date",
								value: recordDate,
								onChange: (event) => setRecordDate(event.target.value),
								required: true,
								className: "input"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Horário da medição",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								name: "record_time",
								value: recordTime,
								onChange: (event) => setRecordTime(event.target.value),
								required: true,
								className: "input"
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-3 text-sm font-semibold text-[var(--foreground)]",
				children: "Sinais vitais"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Pressão sistólica (mmHg)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "bp_systolic",
							min: 50,
							max: 260,
							defaultValue: fieldValue(initialRecord?.bp_systolic),
							className: "input",
							placeholder: "Ex.: 130"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Pressão diastólica (mmHg)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "bp_diastolic",
							min: 30,
							max: 160,
							defaultValue: fieldValue(initialRecord?.bp_diastolic),
							className: "input",
							placeholder: "Ex.: 85"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Frequência cardíaca (bpm)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "heart_rate",
							min: 20,
							max: 220,
							defaultValue: fieldValue(initialRecord?.heart_rate),
							className: "input",
							placeholder: "Ex.: 76"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Temperatura (°C)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							step: "0.1",
							name: "temperature",
							min: 30,
							max: 43,
							defaultValue: fieldValue(initialRecord?.temperature),
							className: "input",
							placeholder: "Ex.: 36,6"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Saturação O₂ (%)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "spo2",
							min: 50,
							max: 100,
							defaultValue: fieldValue(initialRecord?.spo2),
							className: "input",
							placeholder: "Ex.: 97"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Glicemia (mg/dL)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "glucose",
							min: 30,
							max: 600,
							defaultValue: fieldValue(initialRecord?.glucose),
							className: "input",
							placeholder: "Ex.: 110"
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-3 text-sm font-semibold text-[var(--foreground)]",
				children: "Medicação e cuidados"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Medicação administrada",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "medications",
							rows: 2,
							defaultValue: initialRecord?.medications || "",
							className: "input",
							placeholder: "Nome, dose e horário de cada medicamento"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Alimentação",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "feeding",
							rows: 2,
							defaultValue: initialRecord?.feeding || "",
							className: "input",
							placeholder: "Refeições realizadas, aceitação, hidratação..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Higiene",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "hygiene",
							rows: 2,
							defaultValue: initialRecord?.hygiene || "",
							className: "input",
							placeholder: "Banho, troca de roupa, cuidados de pele..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mobilidade / atividades",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "mobility",
							rows: 2,
							defaultValue: initialRecord?.mobility || "",
							className: "input",
							placeholder: "Caminhadas, exercícios, tempo em cadeira/cama..."
						})
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 text-sm font-semibold text-[var(--foreground)]",
					children: "Humor e estado geral"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Humor predominante",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							name: "mood",
							className: "input",
							defaultValue: initialRecord?.mood || "bem",
							children: MOODS.map((mood) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: mood.value,
								children: mood.label
							}, mood.value))
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nível de dor relatado (0 a 10)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							name: "pain_level",
							min: 0,
							max: 10,
							defaultValue: fieldValue(initialRecord?.pain_level ?? 0),
							className: "input"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Observações gerais",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						name: "notes",
						rows: 3,
						defaultValue: initialRecord?.notes || "",
						className: "input mt-3",
						placeholder: "Como foi o dia, comportamento, qualquer detalhe relevante..."
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 text-sm font-semibold text-[var(--foreground)]",
					children: "Intercorrências"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm text-[var(--foreground)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						name: "incident",
						checked: incident,
						onChange: (event) => setIncident(event.target.checked),
						className: "h-4 w-4"
					}), "Houve alguma intercorrência hoje (queda, mal-estar, alteração súbita etc.)"]
				}),
				incident && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					name: "incident_description",
					rows: 3,
					required: incident,
					defaultValue: initialRecord?.incident_description || "",
					className: "input mt-3",
					placeholder: "Descreva o que aconteceu, horário e as providências tomadas."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 text-sm font-semibold text-[var(--foreground)]",
					children: "Foto (opcional)"
				}),
				initialRecord?.photo_data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mb-3 flex items-center gap-2 text-sm text-[var(--muted)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						name: "remove_photo",
						className: "h-4 w-4 accent-[var(--brand)]"
					}), "Remover a foto atual"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					name: "photo",
					accept: "image/png,image/jpeg,image/webp",
					className: "text-sm"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-[var(--muted-2)]",
					children: "JPG, PNG ou WEBP, até 3 MB."
				})
			] }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-[var(--status-critical)]",
				role: "alert",
				"aria-live": "polite",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-3 border-t border-[var(--border)] pt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: loading,
					className: "rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50",
					children: loading ? "Salvando..." : isEditing ? `Atualizar registro de ${patientName}` : `Salvar registro de ${patientName}`
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
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "mb-1 block text-xs font-medium text-[var(--muted)]",
		children: label
	}), children] });
}
//#endregion
export { DailyRecordForm };
