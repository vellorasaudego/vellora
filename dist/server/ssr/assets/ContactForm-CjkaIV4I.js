import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import Link from "./link-H0xyTzG3.js";
import { t as TurnstileWidget } from "./TurnstileWidget-R9KWyzkA.js";
//#region src/components/ContactForm.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CARE_TYPES = [
	"Ainda não sei",
	"Cuidador 12h ou 24h",
	"Técnico de enfermagem",
	"Pós-operatório",
	"Cuidados paliativos",
	"Fisioterapia domiciliar",
	"Mobilidade reduzida",
	"Cuidado ao idoso"
];
var SCHEDULES = [
	"A definir",
	"12h diurno",
	"12h noturno",
	"24 horas",
	"Visitas programadas"
];
var URGENCY_OPTIONS = [
	"Sem urgência",
	"Nos próximos 30 dias",
	"Nos próximos 7 dias",
	"O quanto antes"
];
function formValue(data, key) {
	return String(data.get(key) || "").trim();
}
function ContactForm({ turnstileSiteKey = "" }) {
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [error, setError] = (0, import_react.useState)(null);
	const [turnstileToken, setTurnstileToken] = (0, import_react.useState)("");
	async function handleSubmit(event) {
		event.preventDefault();
		setStatus("sending");
		setError(null);
		const form = event.currentTarget;
		const data = new FormData(form);
		const structuredDetails = [
			["Idade do paciente", formValue(data, "patient_age")],
			["Horário necessário", formValue(data, "schedule")],
			["Grau de parentesco", formValue(data, "relationship")],
			["Cidade", formValue(data, "city")],
			["Data de início desejada", formValue(data, "start_date")],
			["Urgência", formValue(data, "urgency")]
		].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
		const freeMessage = formValue(data, "message");
		const message = [...structuredDetails, freeMessage ? `Mensagem: ${freeMessage}` : ""].filter(Boolean).join("\n");
		const payload = {
			name: formValue(data, "name"),
			email: formValue(data, "email"),
			phone: formValue(data, "phone"),
			patient_name: formValue(data, "patient_name"),
			care_type: formValue(data, "care_type"),
			message,
			consent: data.get("consent") === "on",
			company: formValue(data, "company"),
			turnstile_token: turnstileToken
		};
		try {
			const response = await fetch("/api/solicitacoes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				cache: "no-store",
				body: JSON.stringify(payload)
			});
			const result = (response.headers.get("content-type") || "").includes("application/json") ? await response.json() : { error: "O servidor não conseguiu concluir o envio. Tente novamente." };
			if (!response.ok) {
				setError(result.error || "Não foi possível enviar. Tente novamente.");
				setStatus("error");
				return;
			}
			setStatus(result.preview ? "sent-preview" : "sent");
			setTurnstileToken("");
			form.reset();
		} catch (requestError) {
			console.error("[ContactForm] Falha ao enviar solicitação.", requestError);
			setError("Não foi possível enviar. Verifique sua conexão e tente novamente.");
			setStatus("error");
		}
	}
	if (status === "sent" || status === "sent-preview") {
		const previewOnly = status === "sent-preview";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-[#bfe7df] bg-[var(--brand-light)] p-8 text-center",
			role: "status",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white",
					"aria-hidden": "true",
					children: "✓"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-lg font-semibold text-[var(--foreground)]",
					children: previewOnly ? "Formulário demonstrado com segurança" : "Recebemos sua solicitação"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-[var(--muted)]",
					children: previewOnly ? "Esta é uma prévia: os dados preenchidos não foram gravados nem enviados à equipe." : "A equipe da Vellora vai analisar as informações e entrar em contato para entender melhor a necessidade da sua família."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-5 text-sm font-semibold text-[var(--brand)] hover:underline",
					onClick: () => setStatus("idle"),
					children: "Enviar outra solicitação"
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		className: "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "contact-company",
					children: "Empresa"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "contact-company",
					name: "company",
					tabIndex: -1,
					autoComplete: "off"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-patient",
				className: "form-label",
				children: "Nome do paciente *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-patient",
				name: "patient_name",
				autoComplete: "off",
				required: true,
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-age",
				className: "form-label",
				children: "Idade do paciente"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-age",
				name: "patient_age",
				type: "number",
				min: "0",
				max: "120",
				inputMode: "numeric",
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-care",
				className: "form-label",
				children: "Tipo de cuidado *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "contact-care",
				name: "care_type",
				required: true,
				className: "form-control",
				defaultValue: CARE_TYPES[0],
				children: CARE_TYPES.map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: type,
					children: type
				}, type))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-schedule",
				className: "form-label",
				children: "Horário necessário"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "contact-schedule",
				name: "schedule",
				className: "form-control",
				defaultValue: SCHEDULES[0],
				children: SCHEDULES.map((schedule) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: schedule,
					children: schedule
				}, schedule))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-name",
				className: "form-label",
				children: "Seu nome *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-name",
				name: "name",
				autoComplete: "name",
				required: true,
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-relationship",
				className: "form-label",
				children: "Grau de parentesco"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-relationship",
				name: "relationship",
				className: "form-control",
				placeholder: "Filho(a), neto(a)..."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-phone",
				className: "form-label",
				children: "Telefone / WhatsApp *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-phone",
				name: "phone",
				type: "tel",
				inputMode: "tel",
				autoComplete: "tel",
				required: true,
				className: "form-control",
				placeholder: "(62) 9XXXX-XXXX"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-email",
				className: "form-label",
				children: "E-mail *"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-email",
				name: "email",
				type: "email",
				autoComplete: "email",
				required: true,
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-city",
				className: "form-label",
				children: "Cidade"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-city",
				name: "city",
				autoComplete: "address-level2",
				className: "form-control",
				defaultValue: "Goiânia"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-start",
				className: "form-label",
				children: "Data de início desejada"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "contact-start",
				name: "start_date",
				type: "date",
				className: "form-control"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: "contact-urgency",
				className: "form-label",
				children: "Urgência"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "contact-urgency",
				name: "urgency",
				className: "form-control",
				defaultValue: URGENCY_OPTIONS[0],
				children: URGENCY_OPTIONS.map((urgency) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: urgency,
					children: urgency
				}, urgency))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sm:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "contact-message",
					className: "form-label",
					children: "Mensagem"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "contact-message",
					name: "message",
					rows: 4,
					className: "form-control resize-y",
					placeholder: "Conte brevemente quais atividades exigem ajuda. Não envie documentos médicos."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-lg bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--muted)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					name: "consent",
					type: "checkbox",
					required: true,
					className: "mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Autorizo o uso destes dados exclusivamente para que a Vellora entre em contato sobre esta solicitação. Consulte a ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: "font-semibold text-[var(--brand)] underline",
						href: "/privacidade",
						children: "Política de Privacidade"
					}),
					"."
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
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: status === "sending",
					className: "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand-dark)] px-7 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50",
					children: status === "sending" ? "Enviando..." : "Enviar solicitação"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs leading-5 text-[var(--muted-2)]",
					children: "Evite compartilhar informações clínicas sensíveis neste primeiro contato."
				})]
			})
		]
	});
}
//#endregion
export { ContactForm };
