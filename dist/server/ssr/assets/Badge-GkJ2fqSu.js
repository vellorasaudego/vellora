import { n as require_jsx_runtime } from "../index.js";
//#region src/components/ui/Badge.tsx
var import_jsx_runtime = require_jsx_runtime();
var NEUTRAL_STYLES = {
	ativo: "bg-[var(--accent-light)] text-[var(--accent)]",
	pendente: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
	inativo: "bg-gray-100 text-gray-500",
	novo: "bg-[var(--brand-light)] text-[var(--brand-dark)]",
	em_contato: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
	em_analise: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
	convertido: "bg-[var(--accent-light)] text-[var(--accent)]",
	aprovado: "bg-[var(--accent-light)] text-[var(--accent)]",
	recusado: "bg-gray-100 text-gray-500",
	aguardando_acesso: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
};
var NEUTRAL_LABEL = {
	ativo: "Ativo",
	pendente: "Pendente",
	inativo: "Inativo",
	novo: "Novo",
	em_contato: "Em contato",
	em_analise: "Em análise",
	convertido: "Convertido",
	aprovado: "Aprovado",
	recusado: "Recusado",
	aguardando_acesso: "Aguardando acesso"
};
function Pill({ value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${NEUTRAL_STYLES[value] || "bg-gray-100 text-gray-500"}`,
		children: NEUTRAL_LABEL[value] || value
	});
}
//#endregion
export { Pill as t };
