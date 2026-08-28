import { n as runtimeValue } from "./runtime-config-B9JrV3R1.js";
//#region src/lib/email.ts
function configuredAppUrl() {
	const value = runtimeValue("VELLORA_APP_URL")?.trim();
	if (!value) throw new Error("VELLORA_APP_URL não configurada.");
	const url = new URL(value);
	const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
	if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("VELLORA_APP_URL deve usar HTTPS.");
	return url.origin;
}
function isPasswordEmailConfigured() {
	if (!runtimeValue("RESEND_API_KEY") || !runtimeValue("VELLORA_EMAIL_FROM")?.trim()) return false;
	try {
		configuredAppUrl();
		return true;
	} catch {
		return false;
	}
}
async function sendPasswordResetEmail(input) {
	const apiKey = runtimeValue("RESEND_API_KEY");
	const from = runtimeValue("VELLORA_EMAIL_FROM")?.trim();
	if (!apiKey || !from) throw new Error("Serviço de e-mail não configurado.");
	const resetUrl = new URL("/redefinir-senha", configuredAppUrl());
	resetUrl.searchParams.set("token", input.token);
	const link = resetUrl.toString();
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"Idempotency-Key": `password-reset-${input.requestId}`
		},
		body: JSON.stringify({
			from,
			to: input.to,
			subject: "Redefinição de senha — Vellora Saúde",
			text: `Recebemos uma solicitação para redefinir sua senha na Vellora Saúde.\n\nUse este link em até 30 minutos: ${link}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
			html: `
        <div style="background:#f4f7f5;padding:32px 16px;font-family:Arial,sans-serif;color:#143b37">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dce7e3;border-radius:20px;padding:32px">
            <p style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a682f">Vellora Saúde</p>
            <h1 style="font-size:26px;line-height:1.2;margin:12px 0 16px">Redefina sua senha</h1>
            <p style="font-size:16px;line-height:1.6;color:#4e6562">Recebemos uma solicitação para trocar a senha da sua área exclusiva.</p>
            <p style="margin:28px 0">
              <a href="${link}" style="display:inline-block;background:#15554e;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Criar nova senha</a>
            </p>
            <p style="font-size:14px;line-height:1.6;color:#6b7c79">Este link é válido por 30 minutos e pode ser usado uma única vez. Se você não fez esta solicitação, ignore este e-mail.</p>
          </div>
        </div>`
		})
	});
	if (!response.ok) throw new Error(`Falha no envio do e-mail (${response.status}).`);
}
//#endregion
export { isPasswordEmailConfigured, sendPasswordResetEmail };
