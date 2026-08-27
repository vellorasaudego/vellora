import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import Link from "./link-H0xyTzG3.js";
import { t as TurnstileWidget } from "./TurnstileWidget-R9KWyzkA.js";
//#region src/components/ProfessionalApplicationForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var PROFESSIONS = [
	{
		value: "cuidador",
		label: "Cuidador(a)"
	},
	{
		value: "tecnico_enfermagem",
		label: "Técnico(a) de enfermagem"
	},
	{
		value: "enfermeiro",
		label: "Enfermeiro(a)"
	},
	{
		value: "outros",
		label: "Outros"
	}
];
var DAYS = [
	{
		value: "segunda",
		label: "Segunda"
	},
	{
		value: "terca",
		label: "Terça"
	},
	{
		value: "quarta",
		label: "Quarta"
	},
	{
		value: "quinta",
		label: "Quinta"
	},
	{
		value: "sexta",
		label: "Sexta"
	},
	{
		value: "sabado",
		label: "Sábado"
	},
	{
		value: "domingo",
		label: "Domingo"
	}
];
var SHIFTS = [
	{
		value: "manha",
		label: "Manhã · 6h às 12h"
	},
	{
		value: "tarde",
		label: "Tarde · 12h às 18h"
	},
	{
		value: "noite",
		label: "Noite · 18h às 6h"
	},
	{
		value: "plantao_12h_diurno",
		label: "Plantão 12h diurno"
	},
	{
		value: "plantao_12h_noturno",
		label: "Plantão 12h noturno"
	},
	{
		value: "plantao_24h",
		label: "Plantão 24h"
	}
];
var EXPERIENCE_OPTIONS = [
	"Menos de 1 ano",
	"De 1 a 2 anos",
	"De 3 a 5 anos",
	"Mais de 5 anos"
];
function fieldValue(data, key) {
	return String(data.get(key) || "").trim();
}
function ProfessionalApplicationForm({ turnstileSiteKey = "" }) {
	const [profession, setProfession] = (0, import_react.useState)("cuidador");
	const requiresCoren = profession === "tecnico_enfermagem" || profession === "enfermeiro";
	const [lgpdAuthorized, setLgpdAuthorized] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [error, setError] = (0, import_react.useState)(null);
	const [turnstileToken, setTurnstileToken] = (0, import_react.useState)("");
	async function handleSubmit(event) {
		event.preventDefault();
		setError(null);
		const form = event.currentTarget;
		const data = new FormData(form);
		const availabilityDays = data.getAll("availability_days").map(String);
		const availabilityShifts = data.getAll("availability_shifts").map(String);
		if (availabilityDays.length === 0 || availabilityShifts.length === 0) {
			setStatus("error");
			setError("Selecione pelo menos um dia e um horário disponível.");
			return;
		}
		setStatus("sending");
		try {
			const response = await fetch("/api/professionals", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: fieldValue(data, "name"),
					email: fieldValue(data, "email"),
					phone: fieldValue(data, "phone"),
					city: fieldValue(data, "city"),
					profession: fieldValue(data, "profession"),
					coren: fieldValue(data, "coren"),
					experience: fieldValue(data, "experience"),
					availability_days: availabilityDays,
					availability_shifts: availabilityShifts,
					available_from: fieldValue(data, "available_from"),
					notes: fieldValue(data, "notes"),
					consent: data.get("consent") === "on",
					company: fieldValue(data, "company"),
					turnstile_token: turnstileToken
				})
			});
			const result = await response.json().catch(() => null);
			if (!response.ok) throw new Error(result?.error || "Não foi possível enviar o cadastro agora.");
			form.reset();
			setProfession("cuidador");
			setLgpdAuthorized(false);
			setTurnstileToken("");
			setStatus(result?.preview ? "sent-preview" : "sent");
		} catch (submissionError) {
			setStatus("error");
			setError(submissionError instanceof Error ? submissionError.message : "Erro de conexão. Tente novamente.");
		}
	}
	if (status === "sent" || status === "sent-preview") {
		const previewOnly = status === "sent-preview";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl bg-[var(--brand-light)] p-8 text-center",
			role: "status",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white",
					"aria-hidden": "true",
					children: "✓"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-lg font-semibold text-[var(--foreground)]",
					children: previewOnly ? "Cadastro demonstrado com segurança" : "Cadastro recebido"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-[var(--muted)]",
					children: previewOnly ? "Esta é uma prévia: os dados preenchidos não foram gravados nem enviados à equipe." : "A equipe da Vellora Saúde analisará seus dados profissionais e entrará em contato quando houver uma oportunidade compatível."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-5 text-sm font-semibold text-[var(--brand)] hover:underline",
					onClick: () => setStatus("idle"),
					children: "Fazer outro cadastro"
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sr-only",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "professional-company",
					children: "Empresa"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "professional-company",
					name: "company",
					tabIndex: -1,
					autoComplete: "off"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-name",
				className: "form-label",
				children: "Nome completo *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-name",
				name: "name",
				autoComplete: "name",
				required: true,
				maxLength: 120,
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-role",
				className: "form-label",
				children: "Área profissional *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "professional-role",
				name: "profession",
				required: true,
				className: "form-control",
				value: profession,
				onChange: (event) => setProfession(event.target.value),
				children: PROFESSIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: option.value,
					children: option.label
				}, option.value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-phone",
				className: "form-label",
				children: "Telefone / WhatsApp *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-phone",
				name: "phone",
				type: "tel",
				inputMode: "tel",
				autoComplete: "tel",
				required: true,
				maxLength: 30,
				className: "form-control",
				placeholder: "(62) 9XXXX-XXXX"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-email",
				className: "form-label",
				children: "E-mail *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-email",
				name: "email",
				type: "email",
				autoComplete: "email",
				required: true,
				maxLength: 160,
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-city",
				className: "form-label",
				children: "Cidade *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-city",
				name: "city",
				autoComplete: "address-level2",
				required: true,
				maxLength: 100,
				className: "form-control",
				defaultValue: "Goiânia"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: "professional-coren",
				className: "form-label",
				children: ["COREN ", requiresCoren ? "*" : "(se aplicável)"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-coren",
				name: "coren",
				required: requiresCoren,
				maxLength: 40,
				className: "form-control",
				placeholder: "Número e UF"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-experience",
				className: "form-label",
				children: "Experiência na área *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				id: "professional-experience",
				name: "experience",
				required: true,
				className: "form-control",
				defaultValue: "",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					disabled: true,
					children: "Selecione"
				}), EXPERIENCE_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: option,
					children: option
				}, option))]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "professional-start",
				className: "form-label",
				children: "Disponível a partir de"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "professional-start",
				name: "available_from",
				type: "date",
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
				className: "sm:col-span-2 rounded-xl border border-[var(--border)] p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "px-1 text-sm font-semibold text-[var(--foreground)]",
						children: "Dias disponíveis *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs leading-5 text-[var(--muted)]",
						children: "Marque todos os dias em que normalmente pode trabalhar."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
						children: DAYS.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--foreground)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								name: "availability_days",
								value: day.value,
								className: "h-4 w-4 accent-[var(--brand)]"
							}), day.label]
						}, day.value))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
				className: "sm:col-span-2 rounded-xl border border-[var(--border)] p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "px-1 text-sm font-semibold text-[var(--foreground)]",
						children: "Horários disponíveis *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs leading-5 text-[var(--muted)]",
						children: "Você pode marcar mais de uma opção."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: SHIFTS.map((shift) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--foreground)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								name: "availability_shifts",
								value: shift.value,
								className: "h-4 w-4 accent-[var(--brand)]"
							}), shift.label]
						}, shift.value))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sm:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "professional-notes",
					className: "form-label",
					children: "Formação, cursos e observações de disponibilidade"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "professional-notes",
					name: "notes",
					rows: 4,
					maxLength: 1200,
					className: "form-control resize-y",
					placeholder: "Informe cursos relevantes, tipos de cuidado com que já trabalhou ou detalhes dos horários. Não envie documentos neste formulário."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--muted)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					name: "consent",
					required: true,
					checked: lgpdAuthorized,
					onChange: (event) => setLgpdAuthorized(event.target.checked),
					className: "mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Li e autorizo a Vellora Saúde a tratar os dados informados para analisar meu perfil profissional e entrar em contato sobre oportunidades, conforme a Lei Geral de Proteção de Dados (LGPD). Consulte a ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: "font-semibold text-[var(--brand)] underline",
						href: "/privacidade",
						children: "Política de Privacidade"
					}),
					". Sei que posso solicitar correção ou exclusão dos meus dados pelos canais da empresa. *"
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TurnstileWidget, {
				siteKey: turnstileSiteKey,
				onToken: setTurnstileToken
			}),
			turnstileSiteKey && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "hidden",
				name: "turnstile_token",
				value: turnstileToken,
				readOnly: true
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sm:col-span-2 text-sm text-[var(--status-critical)]",
				role: "alert",
				"aria-live": "polite",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sm:col-span-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: status === "sending" || !lgpdAuthorized,
						"aria-disabled": status === "sending" || !lgpdAuthorized,
						title: !lgpdAuthorized ? "Autorize o uso dos dados para enviar a solicitação" : void 0,
						className: "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand-dark)] px-7 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-40",
						children: status === "sending" ? "Enviando..." : "Enviar solicitação"
					}),
					!lgpdAuthorized ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs font-medium text-[var(--brand-dark)]",
						role: "status",
						children: "Marque a autorização de uso dos dados para liberar o envio."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs leading-5 text-[var(--muted-2)]",
						children: "O envio não garante contratação. A Vellora Saúde poderá solicitar documentos somente em uma etapa posterior da seleção."
					})
				]
			})
		]
	});
}
//#endregion
export { ProfessionalApplicationForm };
