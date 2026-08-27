import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
import { t as Pill } from "./Badge-GkJ2fqSu.js";
import { ContractManager } from "./ContractManager-BFueNZHD.js";
import { DeleteButton } from "./DeleteButton-D2qeWxlx.js";
//#region src/components/admin/CaregiverBank.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
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
var PROFESSION_LABELS = {
	cuidador: "Cuidador(a)",
	tecnico_enfermagem: "Técnico(a) de enfermagem",
	enfermeiro: "Enfermeiro(a)",
	outros: "Outros"
};
function CaregiverBank({ profiles, patientsByProfile, contractsByProfile }) {
	const router = useRouter();
	const [openProfileId, setOpenProfileId] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function createAccess(event, profileId) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		const form = event.currentTarget;
		const data = new FormData(form);
		try {
			const response = await fetch(`/api/admin/caregivers/${profileId}/access`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: data.get("email"),
					password: data.get("password")
				})
			});
			const result = await response.json().catch(() => null);
			if (!response.ok) throw new Error(result?.error || "Não foi possível criar o acesso.");
			setOpenProfileId(null);
			router.refresh();
		} catch (submissionError) {
			setError(submissionError instanceof Error ? submissionError.message : "Erro ao criar acesso.");
		} finally {
			setLoading(false);
		}
	}
	if (profiles.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-medium text-[var(--foreground)]",
			children: "O banco de profissionais está vazio."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-[var(--muted)]",
			children: "Quando uma candidatura for aprovada, o perfil aparecerá aqui automaticamente."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: profiles.map((profile) => {
			const isCreatingAccess = openProfileId === profile.id;
			const patients = patientsByProfile[profile.id] || [];
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold text-[var(--foreground)]",
										children: profile.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { value: profile.account_status })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-sm text-[var(--muted)]",
									children: [PROFESSION_LABELS[profile.profession], profile.coren ? ` · COREN ${profile.coren}` : ""]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]",
												children: "Contato"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-[var(--foreground)]",
												children: profile.phone
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "break-all text-[var(--muted)]",
												children: profile.contact_email
											})
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]",
												children: "Disponibilidade"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-[var(--foreground)]",
												children: profile.availability_days.map((day) => DAY_LABELS[day] || day).join(", ")
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[var(--muted)]",
												children: profile.availability_shifts.map((shift) => SHIFT_LABELS[shift] || shift).join(", ")
											})
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]",
												children: "Acesso e escala"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-[var(--foreground)]",
												children: profile.access_email || "Acesso ainda não criado"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[var(--muted)]",
												children: patients.join(", ") || "Sem paciente atribuído"
											})
										] })
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 flex-col items-start gap-3 lg:items-end",
							children: [profile.account_status === "aguardando_acesso" && !profile.user_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setError(null);
									setOpenProfileId(isCreatingAccess ? null : profile.id);
								},
								className: "rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]",
								children: isCreatingAccess ? "Cancelar" : "Criar e-mail e senha"
							}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeleteButton, {
								endpoint: `/api/admin/caregivers/${profile.id}`,
								confirmText: `Excluir o cadastro de ${profile.name}? O acesso será encerrado, vínculos ativos serão removidos e os registros históricos serão preservados sem os dados pessoais do profissional.`,
								label: "Excluir cuidador",
								compact: true
							})]
						})]
					}),
					isCreatingAccess ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => createAccess(event, profile.id),
						className: "mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: `access-email-${profile.id}`,
								className: "block text-xs font-medium text-[var(--muted)]",
								children: "E-mail de acesso *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: `access-email-${profile.id}`,
								name: "email",
								type: "email",
								required: true,
								defaultValue: profile.contact_email,
								autoComplete: "off",
								className: "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: `access-password-${profile.id}`,
								className: "block text-xs font-medium text-[var(--muted)]",
								children: "Senha provisória *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: `access-password-${profile.id}`,
								name: "password",
								type: "password",
								required: true,
								minLength: 12,
								autoComplete: "new-password",
								placeholder: "Mínimo de 12 caracteres",
								className: "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: loading,
								className: "min-h-10 rounded-lg bg-[var(--brand-dark)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50",
								children: loading ? "Criando..." : "Ativar acesso"
							}),
							error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-[var(--status-critical)] sm:col-span-2 lg:col-span-3",
								role: "alert",
								children: error
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs leading-5 text-[var(--muted-2)] sm:col-span-2 lg:col-span-3",
								children: "Oriente o profissional a trocar a senha provisória usando “Esqueci minha senha” após o primeiro acesso."
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractManager, {
						ownerType: "caregiver_profile",
						ownerId: profile.id,
						contracts: contractsByProfile[profile.id] || []
					})
				]
			}, profile.id);
		})
	});
}
//#endregion
export { CaregiverBank };
