"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthProvider } from "@/lib/auth-provider";

const RESET_PASSWORD_REQUEST_TIMEOUT_MS = 20_000;
const SUCCESS_REDIRECT_DELAY_MS = 1_200;

export function ResetPasswordForm({
  token,
  provider = "legacy",
  initialError,
}: {
  token: string;
  provider?: AuthProvider;
  initialError?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      RESET_PASSWORD_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...(provider === "legacy" ? { token } : {}),
          password,
        }),
      });
      const data = await response.json().catch(() => null) as { ok?: unknown; error?: unknown } | null;
      if (!response.ok || data?.ok !== true) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Não foi possível redefinir a senha. Tente novamente mais tarde.",
        );
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        router.replace("/login?senha=redefinida");
      }, SUCCESS_REDIRECT_DELAY_MS);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError(
          "A redefinição demorou mais que o esperado. Verifique sua conexão antes de tentar novamente.",
        );
      } else {
        setError("Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  const invalidLinkMessage = initialError ?? (provider === "legacy" && !token
    ? "Este link está incompleto. Solicite um novo e-mail de recuperação."
    : null);

  if (invalidLinkMessage) {
    return (
      <div className="space-y-4" role="alert">
        <p className="rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]">
          {invalidLinkMessage}
        </p>
        <Link
          href="/esqueci-senha"
          className="block text-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <p className="rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]">
          Senha redefinida com sucesso. Você será redirecionado para o login.
        </p>
        <Link
          href="/login?senha=redefinida"
          className="block text-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]"
        >
          Ir para o login agora
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Nova senha</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="form-control"
          placeholder="Mínimo de 12 caracteres"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Confirme a nova senha</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="form-control"
          placeholder="Digite a senha novamente"
        />
      </div>
      {error && <p className="text-sm text-[var(--status-critical)]" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[var(--brand-dark)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Criar nova senha"}
      </button>
    </form>
  );
}
