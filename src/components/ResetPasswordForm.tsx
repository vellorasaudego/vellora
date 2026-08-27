"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível redefinir a senha.");
        setLoading(false);
        return;
      }
      router.replace("/login?senha=redefinida");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]" role="alert">
        Este link está incompleto. Solicite um novo e-mail de recuperação.
      </p>
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
