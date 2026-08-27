import { A as __toESM, C as require_react, n as require_jsx_runtime } from "../index.js";
import { t as useRouter } from "./navigation-BEz60pAp.js";
//#region src/components/LogoutButton.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function LogoutButton() {
	const router = useRouter();
	const [loading, setLoading] = (0, import_react.useState)(false);
	async function handleLogout() {
		setLoading(true);
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} finally {
			router.push("/");
			router.refresh();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick: handleLogout,
		disabled: loading,
		className: "text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50",
		children: loading ? "Saindo..." : "Sair"
	});
}
//#endregion
export { LogoutButton };
